import { randomUUID, randomInt } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { createTestDataSource } from '../support/test-database';
import { loadLocalEnvironment } from '../../src/config/local-environment';
import { readEnvironment } from '../../src/config/environment';
import { RegistryService } from '../../src/registry/application/registry.service';
import { PostgresRegistryStore } from '../../src/registry/infrastructure/postgres-registry-store';
import {
  EnrollmentGate,
  StoredEnrollmentReader,
} from '../../src/registry/application/enrollment-gate';
import { FixedClock } from '../support/fixed-clock';

describe('Registry in isolated PostgreSQL', () => {
  let source: DataSource;
  let store: PostgresRegistryStore;
  let other: PostgresRegistryStore;
  let service: RegistryService;
  let second: RegistryService;
  const actor = randomUUID();
  const phones: string[] = [];
  const input = () => {
    const phone = `+55469${randomInt(10000000, 99999999)}`;
    phones.push(phone);
    return {
      name: 'Aluno sintético',
      phone,
      universityId: 'unimater',
      habitualDays: [],
      contract: { startDate: '2026-10-01', endDate: '2026-10-31' },
    };
  };
  beforeAll(async () => {
    const env = loadLocalEnvironment('test');
    source = createTestDataSource(env);
    await source.initialize();
    await source.runMigrations();
    await source.query(
      "INSERT INTO app.team_users(id,subject,role,active) VALUES($1,$1,'operator',true)",
      [actor],
    );
    store = new PostgresRegistryStore(readEnvironment(env).database);
    other = new PostgresRegistryStore(readEnvironment(env).database);
    service = new RegistryService(store);
    second = new RegistryService(other);
  });
  afterAll(async () => {
    await store?.close();
    await other?.close();
    if (source?.isInitialized) {
      await source.query(
        'DELETE FROM app.contracts WHERE student_id IN (SELECT id FROM app.students WHERE phone=ANY($1::text[]))',
        [phones],
      );
      await source.query(
        'DELETE FROM app.students WHERE phone=ANY($1::text[])',
        [phones],
      );
      await source.query('DELETE FROM app.team_users WHERE id=$1', [actor]);
      await source.destroy();
    }
  });
  it('atomically persists a student and first period across connections', async () => {
    const command = input();
    const created = await service.createStudent(actor, command);
    expect(await second.student(actor, created.student.id)).toEqual(
      created.student,
    );
    expect(await second.contracts(actor, created.student.id)).toEqual([
      created.contract,
    ]);
  });
  it('does not persist a student when the initial period is invalid', async () => {
    const command = input();
    await expect(
      service.createStudent(actor, {
        ...command,
        contract: { startDate: '2026-11-01', endDate: '2026-10-01' },
      }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    expect(
      await source.query('SELECT id FROM app.students WHERE phone=$1', [
        command.phone,
      ]),
    ).toHaveLength(0);
  });
  it('permits only one concurrent normalized phone', async () => {
    const command = input();
    const results = await Promise.allSettled([
      service.createStudent(actor, command),
      second.createStudent(actor, {
        ...command,
        phone: command.phone.replace('+55', '+55 '),
      }),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((r) => r.status === 'rejected')).toMatchObject({
      reason: { code: 'PHONE_IN_USE' },
    });
  });
  it('updates with revision protection and preserves periods when deactivated', async () => {
    const command = input();
    const created = await service.createStudent(actor, command);
    const { name, phone, universityId, habitualDays } = command;
    const fields = { name, phone, universityId, habitualDays };
    const gate = new EnrollmentGate(
      new StoredEnrollmentReader(other),
      new FixedClock('2026-10-23T12:00:00Z'),
    );
    await expect(gate.check(phone)).resolves.toMatchObject({
      status: 'VALID_ENROLLMENT',
    });
    const patch = { ...fields, active: false, expectedVersion: 1 };
    expect(
      await service.updateStudent(actor, created.student.id, patch),
    ).toMatchObject({ active: false, version: 2 });
    await expect(
      second.updateStudent(actor, created.student.id, patch),
    ).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
    expect(await service.contracts(actor, created.student.id)).toEqual([
      created.contract,
    ]);
    await expect(gate.check(phone)).resolves.toMatchObject({
      status: 'INACTIVE_STUDENT',
    });
  });
  it('serializes overlapping renewals and allows the following day', async () => {
    const created = await service.createStudent(actor, input());
    const period = { startDate: '2026-11-01', endDate: '2026-11-30' };
    const results = await Promise.allSettled([
      service.addContract(actor, created.student.id, period),
      second.addContract(actor, created.student.id, period),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((r) => r.status === 'rejected')).toMatchObject({
      reason: { code: 'CONTRACT_OVERLAP' },
    });
    await expect(
      service.addContract(actor, created.student.id, {
        startDate: '2026-10-31',
        endDate: '2026-11-01',
      }),
    ).rejects.toMatchObject({ code: 'CONTRACT_OVERLAP' });
    expect(await service.contracts(actor, created.student.id)).toHaveLength(2);
  });
  it('edits periods without self-overlap and rejects other periods or stale revisions', async () => {
    const created = await service.createStudent(actor, input());
    await service.addContract(actor, created.student.id, {
      startDate: '2026-11-01',
      endDate: '2026-11-30',
    });
    const edit = {
      startDate: '2026-10-02',
      endDate: '2026-10-30',
      expectedVersion: 1,
    };
    expect(
      await service.updateContract(actor, created.contract.id, edit),
    ).toMatchObject({
      startDate: edit.startDate,
      endDate: edit.endDate,
      version: 2,
    });
    await expect(
      second.updateContract(actor, created.contract.id, edit),
    ).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
    await expect(
      service.updateContract(actor, created.contract.id, {
        ...edit,
        endDate: '2026-11-01',
        expectedVersion: 2,
      }),
    ).rejects.toMatchObject({ code: 'CONTRACT_OVERLAP' });
  });
  it('revalidates the actor inside the write transaction', async () => {
    const command = input();
    await source.query('UPDATE app.team_users SET active=false WHERE id=$1', [
      actor,
    ]);
    try {
      await expect(service.createStudent(actor, command)).rejects.toMatchObject(
        { code: 'FORBIDDEN' },
      );
    } finally {
      await source.query('UPDATE app.team_users SET active=true WHERE id=$1', [
        actor,
      ]);
    }
    expect(
      await source.query('SELECT id FROM app.students WHERE phone=$1', [
        command.phone,
      ]),
    ).toHaveLength(0);
  });
  it('rolls back a student insert if persistence of its first contract fails', async () => {
    const command = input();
    const id = randomUUID();
    await expect(
      store.transaction(async (tx) => {
        await tx.authorize(actor);
        await tx.saveStudent(
          {
            id,
            name: command.name,
            phone: command.phone,
            universityId: command.universityId,
            habitualDays: [],
            active: true,
            version: 1,
          },
          true,
        );
        await tx.saveContract(
          {
            id: randomUUID(),
            studentId: id,
            startDate: '2026-11-01',
            endDate: '2026-10-01',
            version: 1,
          },
          true,
        );
      }),
    ).rejects.toMatchObject({ code: 'REGISTRY_UNAVAILABLE' });
    expect(
      await source.query('SELECT id FROM app.students WHERE id=$1', [id]),
    ).toHaveLength(0);
  });
  it('coordinates a concurrent extension and renewal through the same parent lock', async () => {
    const created = await service.createStudent(actor, input());
    const results = await Promise.allSettled([
      service.updateContract(actor, created.contract.id, {
        startDate: '2026-10-01',
        endDate: '2026-11-15',
        expectedVersion: 1,
      }),
      second.addContract(actor, created.student.id, {
        startDate: '2026-11-01',
        endDate: '2026-11-30',
      }),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((r) => r.status === 'rejected')).toMatchObject({
      reason: { code: 'CONTRACT_OVERLAP' },
    });
  });
  it('protects duplicate phone edits and keeps the previous record intact', async () => {
    const first = await service.createStudent(actor, input());
    const next = await service.createStudent(actor, input());
    const { name, universityId, habitualDays } = next.student;
    await expect(
      service.updateStudent(actor, next.student.id, {
        name,
        universityId,
        habitualDays,
        phone: first.student.phone,
        active: true,
        expectedVersion: 1,
      }),
    ).rejects.toMatchObject({ code: 'PHONE_IN_USE' });
    expect(await service.student(actor, next.student.id)).toEqual(next.student);
  });
});
