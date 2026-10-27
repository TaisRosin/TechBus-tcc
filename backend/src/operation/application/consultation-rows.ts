import type { RegistryTransaction } from '../../registry/application/ports';
import { evaluateEligibility } from '../../registry/domain/calendar';
import { emptyLegs, type Legs } from '../../journey/domain/journey';
import type { Member } from '../domain/consultation';
export interface ConsultationRow
  extends Omit<Member, 'pickup' | 'dropoff'>,
    Legs {
  studentId: string;
  name: string;
  phone: string;
  universityId: string;
  pickupPlace: { id: string; label: string } | null;
  dropoffPlace: { id: string; label: string } | null;
  issues: string[];
  pending: string[];
  eligible: boolean;
}
export async function consultationRows(
  tx: RegistryTransaction,
  date: string,
): Promise<ConsultationRow[]> {
  const rows: ConsultationRow[] = [];
  for (let offset = 0; ; offset += 100) {
    const students = await tx.students(100, offset);
    for (const candidate of students) {
      const student = (await tx.student(candidate.id, true))!;
      const journey = await tx.journeys.get(student.id, date),
        pending = await tx.journeys.pending(
          student.id,
          date,
          journey?.lastSequence ?? 0,
        );
      const calendar = await tx.calendar(student.universityId, 'read'),
        contracts = await tx.contracts(student.id),
        exception =
          (await tx.exceptions(student.universityId, date, date))[0]
            ?.operates ?? null;
      const eligible = evaluateEligibility(
        { student, calendar, contracts, exception },
        'consultation',
        new Date(`${date}T12:00:00Z`),
      ).eligible;
      if (!journey && !pending.length && !eligible) continue;
      const row: ConsultationRow = {
        studentId: student.id,
        name: student.name,
        phone: student.phone,
        universityId: journey?.universityId ?? student.universityId,
        pickup: journey?.pickup ?? emptyLegs().pickup,
        dropoff: journey?.dropoff ?? emptyLegs().dropoff,
        pickupGroupId: null,
        dropoffGroupId: null,
        pickupPlace: null,
        dropoffPlace: null,
        issues: [],
        pending,
        eligible,
      };
      if (journey && journey.universityId !== student.universityId)
        row.issues.push('CONTEXT_CHANGED');
      if (journey?.closureIssue) row.issues.push(journey.closureIssue);
      if (pending.length) row.issues.push('COMMAND_PENDING');
      for (const side of ['pickup', 'dropoff'] as const) {
        const location =
          side === 'dropoff' && journey?.locationId
            ? await tx.places.location(journey.locationId)
            : null;
        const item =
          side === 'pickup' && journey?.pointId
            ? await tx.places.get('point', journey.pointId)
            : location
              ? await tx.places.get('region', location.regionId)
              : null;
        const group = item?.groupId
          ? await tx.places.get('group', item.groupId)
          : null;
        if (item?.active && group?.active && group.direction === side) {
          row[side === 'pickup' ? 'pickupGroupId' : 'dropoffGroupId'] =
            group.id;
          row[side === 'pickup' ? 'pickupPlace' : 'dropoffPlace'] = location
            ? { id: location.id, label: location.label }
            : { id: item.id, label: item.address ?? item.name };
        } else if (row[side].state === 'confirmado')
          row.issues.push(`${side.toUpperCase()}_LOCATION_INVALID`);
      }
      rows.push(row);
    }
    if (students.length < 100) break;
  }
  return rows;
}
export function membership(row: ConsultationRow): Member {
  return {
    studentId: row.studentId,
    universityId: row.universityId,
    pickup: row.pickup.state === 'confirmado',
    dropoff: row.dropoff.state === 'confirmado',
    pickupGroupId: row.pickupGroupId,
    dropoffGroupId: row.dropoffGroupId,
  };
}
