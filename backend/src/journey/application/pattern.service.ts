import { createHash } from 'node:crypto';
import { AccessError } from '../../access/domain/access';
import {
  RegistryStore,
  type RegistryTransaction,
} from '../../registry/application/ports';
import { uuid } from '../../registry/domain/registry';
import type { Direction } from '../../registry/domain/locations';
import type { Clock } from '../../shared/time/clock';
import { operationalDate } from '../../shared/time/operational-date';
import { sequence, parsePattern } from '../domain/patterns';
import type { CommandResult } from '../domain/journey';
export interface Suggestion {
  key: string;
  direction: Direction;
  placeId: string;
  expectedVersion: number;
}
export class PatternService {
  constructor(
    private readonly store: RegistryStore,
    private readonly clock: Clock,
  ) {}
  async apply(
    studentId: string,
    receiptId: string,
    input: unknown,
  ): Promise<CommandResult> {
    uuid(studentId);
    uuid(receiptId);
    const command = parsePattern(input);
    return this.store.transaction(async (tx) => {
      await tx.places.lock();
      const student = await tx.student(studentId, true);
      if (!student) throw new AccessError('NOT_FOUND', 404);
      const receipt = await tx.journeys.receipt(studentId, receiptId);
      if (!receipt) throw new AccessError('NOT_FOUND', 404);
      if (receipt.result) return receipt.result;
      const finish = async (result: CommandResult) => {
        await tx.journeys.finish(studentId, receiptId, result);
        return result;
      };
      if (receipt.ordering === 'uncertain')
        return finish({ status: 'pending', code: 'ORDER_UNCERTAIN' });
      const hour = Number(
        new Intl.DateTimeFormat('en-GB', {
          timeZone: 'America/Sao_Paulo',
          hour: '2-digit',
          hourCycle: 'h23',
        }).format(receipt.receivedAt),
      );
      if (hour >= 17)
        return finish({ status: 'rejected', code: 'DEADLINE_PASSED' });
      if (!student.active)
        return finish({ status: 'rejected', code: 'STUDENT_INACTIVE' });
      if (
        (await tx.patterns.lastSequence(studentId, command.direction)) >=
        receipt.sequence
      )
        return finish({ status: 'rejected', code: 'STALE_COMMAND' });
      const previous = (await tx.places.defaults(studentId)).find(
        (p) => p.direction === command.direction,
      );
      if ((previous?.version ?? 0) !== command.expectedVersion)
        return finish({ status: 'rejected', code: 'VERSION_CONFLICT' });
      if (command.kind === 'request_default') {
        if (!(await this.validPlace(tx, command.direction, command.placeId)))
          return finish({ status: 'rejected', code: 'LOCATION_INVALID' });
        await tx.places.saveDefault({
          studentId,
          direction: command.direction,
          pointId: command.direction === 'pickup' ? command.placeId : null,
          locationId: command.direction === 'dropoff' ? command.placeId : null,
          source: 'request',
          evidence: receiptId,
          version: command.expectedVersion + 1,
        });
        await tx.patterns.record({
          studentId,
          receiptId,
          direction: command.direction,
          action: 'request',
          sequence: receipt.sequence,
          defaultVersion: command.expectedVersion,
          suggestionKey: null,
          placeId: command.placeId,
        });
        return finish({
          status: 'applied',
          version: command.expectedVersion + 1,
        });
      }
      const suggestion = (
        await this.evaluate(tx, studentId, command.direction, student.active)
      ).suggestion;
      if (!suggestion || suggestion.key !== command.suggestionKey)
        return finish({ status: 'rejected', code: 'SUGGESTION_STALE' });
      if (command.decision === 'accept')
        await tx.places.saveDefault({
          studentId,
          direction: command.direction,
          pointId: command.direction === 'pickup' ? suggestion.placeId : null,
          locationId:
            command.direction === 'dropoff' ? suggestion.placeId : null,
          source: 'consent',
          evidence: receiptId,
          version: command.expectedVersion + 1,
        });
      await tx.patterns.record({
        studentId,
        receiptId,
        direction: command.direction,
        action: command.decision,
        sequence: receipt.sequence,
        defaultVersion: command.expectedVersion,
        suggestionKey: command.suggestionKey,
        placeId: suggestion.placeId,
      });
      return finish({
        status: 'applied',
        version:
          command.expectedVersion + (command.decision === 'accept' ? 1 : 0),
      });
    });
  }
  async current(actor: string, studentId: string) {
    uuid(studentId);
    return this.store.transaction(async (tx) => {
      await tx.authorize(actor);
      await tx.places.lock();
      const student = await tx.student(studentId, true);
      if (!student) throw new AccessError('NOT_FOUND', 404);
      return {
        pickup: await this.evaluate(tx, studentId, 'pickup', student.active),
        dropoff: await this.evaluate(tx, studentId, 'dropoff', student.active),
      };
    });
  }
  private async evaluate(
    tx: RegistryTransaction,
    studentId: string,
    side: Direction,
    active: boolean,
  ) {
    const run = sequence(
      await tx.patterns.contributions(
        studentId,
        side,
        operationalDate(this.clock.now()),
      ),
    );
    const current = (await tx.places.defaults(studentId)).find(
      (p) => p.direction === side,
    );
    const standard = side === 'pickup' ? current?.pointId : current?.locationId;
    let issue: string | null = run.suspended
      ? 'SEQUENCE_LOCATION_REQUIRED'
      : !active
        ? 'STUDENT_INACTIVE'
        : !standard
          ? 'DEFAULT_NOT_CONFIGURED'
          : null;
    let suggestion: Suggestion | null = null;
    if (!issue && run.count >= 4 && run.placeId && run.placeId !== standard) {
      if (!(await this.validPlace(tx, side, run.placeId)))
        issue = 'LOCATION_INVALID';
      else {
        const key = createHash('sha256')
          .update(JSON.stringify([studentId, side, run.startDate, run.placeId]))
          .digest('hex');
        if (!(await tx.patterns.refused(studentId, key)))
          suggestion = {
            key,
            direction: side,
            placeId: run.placeId,
            expectedVersion: current!.version,
          };
      }
    }
    return { count: run.count, suspended: run.suspended, issue, suggestion };
  }
  private async validPlace(
    tx: RegistryTransaction,
    side: Direction,
    id: string,
  ) {
    const location = side === 'dropoff' ? await tx.places.location(id) : null;
    const item =
      side === 'pickup'
        ? await tx.places.get('point', id)
        : location
          ? await tx.places.get('region', location.regionId)
          : null;
    if (!item?.active || !item.groupId) return false;
    const group = await tx.places.get('group', item.groupId);
    return !!group?.active && group.direction === side;
  }
}
