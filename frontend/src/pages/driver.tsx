import { useState } from "react";
import { api, dateLabel, label } from "../lib/api";
import type { DriverTrip, Stop } from "../lib/types";
import {
  Badge,
  Dialog,
  Heading,
  LoadState,
  Notice,
  Refresh,
  Table,
  useLoad,
} from "../components/common";
import { Button } from "../components/ui/button";
export function DriverPage() {
  const state = useLoad(() => api<DriverTrip[]>("/driver/trips"));
  const [selected, setSelected] = useState<string>();
  return (
    <>
      <Heading
        title="Minhas viagens"
        description="Somente atribuições confirmadas para o seu acesso."
      >
        <Refresh onClick={state.reload} />
      </Heading>
      <LoadState {...state} empty={!!state.data && !state.data.length} />
      {state.data && state.data.length > 0 && (
        <Table headers={["Viagem", "Veículo", "Situação", "Passageiros"]}>
          {state.data.map((t) => (
            <tr key={t.id}>
              <td>
                <strong>
                  {label(t.stage)} · {label(t.side)}
                </strong>
                <small>
                  {dateLabel(t.date)}{" "}
                  {t.universityId ? `· ${label(t.universityId)}` : ""}
                </small>
              </td>
              <td>
                {t.vehicle?.identifier ?? "Veículo indisponível"}
                <small>{t.vehicle?.plate}</small>
              </td>
              <td>
                <Badge
                  value={t.needsAdjustment ? "needs_adjustment" : "confirmed"}
                />
              </td>
              <td>
                <Button variant="outline" onClick={() => setSelected(t.id)}>
                  Ver passageiros
                </Button>
              </td>
            </tr>
          ))}
        </Table>
      )}
      {selected && (
        <Dialog
          title="Passageiros e itinerário"
          onClose={() => setSelected(undefined)}
        >
          <TripDetails id={selected} />
        </Dialog>
      )}
    </>
  );
}
function TripDetails({ id }: { id: string }) {
  const state = useLoad(async () => {
    const trip = await api<DriverTrip>(
      `/driver/trips/${encodeURIComponent(id)}`,
    );
    const itinerary = trip.groupId
      ? await api<{
          ordered: Stop[];
          pending: Stop[];
          needsAdjustment: boolean;
          status: string;
        }>(`/driver/trips/${encodeURIComponent(id)}/itinerary`)
      : null;
    return { trip, itinerary };
  }, id);
  return (
    <>
      <LoadState {...state} />
      {state.data && (
        <>
          {state.data.trip.needsAdjustment && (
            <Notice>
              Operação em revisão. Confirme os ajustes com a equipe.
            </Notice>
          )}
          <Table headers={["Passageiro", "Local", "Telefone"]}>
            {state.data.trip.students?.map((s) => (
              <tr key={s.studentId}>
                <td>{s.name}</td>
                <td>
                  {s.place?.label ?? "Local pendente"}
                  {s.place?.stopReference && (
                    <small>{s.place.stopReference}</small>
                  )}
                </td>
                <td>
                  <a href={`tel:${s.phone}`}>{s.phone}</a>
                </td>
              </tr>
            ))}
          </Table>
          {state.data.itinerary && (
            <>
              <h3>Ordem publicada</h3>
              {state.data.itinerary.needsAdjustment && (
                <Notice>O itinerário precisa de revisão pela equipe.</Notice>
              )}
              <ol className="stop-list">
                {state.data.itinerary.ordered.map((s) => (
                  <li key={s.id}>
                    {s.label}
                    {s.stopReference && <small>{s.stopReference}</small>}
                  </li>
                ))}
              </ol>
              {state.data.itinerary.pending.length > 0 && (
                <Notice>
                  {state.data.itinerary.pending.length} locais ainda sem posição
                  publicada.
                </Notice>
              )}
            </>
          )}
        </>
      )}
    </>
  );
}
