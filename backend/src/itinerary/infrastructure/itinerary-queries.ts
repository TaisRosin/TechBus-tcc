import type { EntityManager } from 'typeorm';
import type {
  ItineraryTransaction,
  Publication,
  StopOrder,
} from '../application/ports';
export function itineraryQueries(m: EntityManager): ItineraryTransaction {
  return {
    order: async (id) =>
      (
        await m.query<StopOrder[]>(
          'SELECT group_id AS "groupId",version,stop_ids AS "stopIds" FROM app.group_stop_orders WHERE group_id=$1',
          [id],
        )
      )[0] ?? null,
    saveOrder: async (o) => {
      await m.query(
        'INSERT INTO app.group_stop_orders(group_id,version,stop_ids) VALUES($1,$2,$3) ON CONFLICT(group_id) DO UPDATE SET version=EXCLUDED.version,stop_ids=EXCLUDED.stop_ids',
        [o.groupId, o.version, o.stopIds],
      );
    },
    publication: async (date, id) =>
      (
        await m.query<Publication[]>(
          'SELECT date::text,group_id AS "groupId",version,plan_version AS "planVersion",order_version AS "orderVersion",stop_ids AS "stopIds",source_token AS "sourceToken",published_by AS "publishedBy",published_at AS "publishedAt" FROM app.published_itineraries WHERE date=$1 AND group_id=$2',
          [date, id],
        )
      )[0] ?? null,
    savePublication: async (p) => {
      await m.query(
        'INSERT INTO app.published_itineraries(date,group_id,version,plan_version,order_version,stop_ids,source_token,published_by,published_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(date,group_id) DO UPDATE SET version=EXCLUDED.version,plan_version=EXCLUDED.plan_version,order_version=EXCLUDED.order_version,stop_ids=EXCLUDED.stop_ids,source_token=EXCLUDED.source_token,published_by=EXCLUDED.published_by,published_at=EXCLUDED.published_at',
        [
          p.date,
          p.groupId,
          p.version,
          p.planVersion,
          p.orderVersion,
          p.stopIds,
          p.sourceToken,
          p.publishedBy,
          p.publishedAt,
        ],
      );
    },
  };
}
