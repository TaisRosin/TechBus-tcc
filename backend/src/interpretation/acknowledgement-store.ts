import { returnItem } from '../registry/application/return-item';
import type { EntityManager } from 'typeorm';
import type { RegistryTransaction } from '../registry/application/ports';
import type { Journey } from '../journey/domain/journey';
import { returnGuidance } from '../journey/domain/closing';
import { acknowledgementText } from './acknowledgement';
export async function acknowledgementSnapshot(
  tx: RegistryTransaction,
  journey: Journey,
  now: Date,
) {
  const label = async (side: 'pickup' | 'dropoff'): Promise<string | null> => {
    if (side === 'pickup') {
      const point = journey.pointId
        ? await tx.places.get('point', journey.pointId)
        : null;
      const group = point?.groupId
        ? await tx.places.get('group', point.groupId)
        : null;
      return point?.active && group?.active && group.direction === 'pickup'
        ? point.name
        : null;
    }
    const location = journey.locationId
      ? await tx.places.location(journey.locationId)
      : null;
    const region = location ? await returnItem(tx.places, location) : null;
    const group = region?.groupId
      ? await tx.places.get('group', region.groupId)
      : null;
    return region?.active && group?.active && group.direction === 'dropoff'
      ? location!.label
      : null;
  };
  const guidance = returnGuidance(journey, now);
  const text =
    acknowledgementText(
      journey.date,
      journey,
      await label('pickup'),
      await label('dropoff'),
    ) + (guidance ? '\n' + guidance.text : '');
  return text;
}
export async function prepareAcknowledgement(
  m: EntityManager,
  tx: RegistryTransaction,
  eventId: string,
  journey: Journey,
  now: Date,
) {
  const student = await tx.student(journey.studentId);
  if (!student) throw new Error('ACK_STUDENT_MISSING');
  const text = await acknowledgementSnapshot(tx, journey, now);
  await m.query(
    "UPDATE app.journey_acknowledgements SET state='superseded' WHERE student_id=$1 AND date=$2::date AND state='prepared' AND journey_version<$3",
    [student.id, journey.date, journey.version],
  );
  await m.query(
    `INSERT INTO app.journey_acknowledgements(event_id,student_id,date,journey_version,phone,text,created_at)
 VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(event_id) DO NOTHING`,
    [
      eventId,
      student.id,
      journey.date,
      journey.version,
      student.phone,
      text,
      now,
    ],
  );
}
