import { useState } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import { all, api } from "../lib/api";
import type { Catalog, Itinerary } from "../lib/types";
import {
  AsyncForm,
  Field,
  LoadState,
  Notice,
  Refresh,
  useLoad,
} from "../components/common";
import { Button } from "../components/ui/button";
export function GroupOrder({ id }: { id: string }) {
  const state = useLoad(async () => {
    const [view, boarding, dropoff] = await Promise.all([
      api<Itinerary>(`/operations/groups/${id}/itinerary`),
      all<Catalog>("/boarding-points"),
      all<Catalog>("/dropoff-points"),
    ]);
    return { view, points: [...boarding, ...dropoff] };
  }, id);
  return (
    <>
      <div className="toolbar">
        <Refresh onClick={state.reload} />
      </div>
      <LoadState {...state} />
      {state.data && (
        <OrderEditor
          key={`${state.data.view.order.version}-${state.data.view.previewToken}`}
          id={id}
          {...state.data}
          reload={state.reload}
        />
      )}
    </>
  );
}
function OrderEditor({
  id,
  view,
  points,
  reload,
}: {
  id: string;
  view: Itinerary;
  points: Catalog[];
  reload: () => void;
}) {
  const [order, setOrder] = useState(view.order.stopIds);
  const [add, setAdd] = useState("");
  const names = new Map([
    ...points.map((p) => [p.id, p.name] as const),
    ...view.candidate.ordered.map((s) => [s.id, s.label] as const),
    ...view.candidate.pending.map((s) => [s.id, s.label] as const),
  ]);
  const candidates = [
    ...points
      .filter((p) => p.active && p.groupId === id)
      .map((p) => ({ id: p.id, label: p.name })),
    ...view.candidate.pending,
  ].filter(
    (s, i, a) =>
      !order.includes(s.id) && a.findIndex((t) => t.id === s.id) === i,
  );
  const dirty = JSON.stringify(order) !== JSON.stringify(view.order.stopIds);
  function move(index: number, by: number) {
    setOrder((old) => {
      const next = [...old];
      [next[index], next[index + by]] = [next[index + by], next[index]];
      return next;
    });
  }
  return (
    <div className="group-itinerary">
      <details className="order-editor">
        <summary>Editar ordem padrão do grupo</summary>
        <p className="muted">
          Salvar a ordem não altera a última publicação. Publique o itinerário
          do dia explicitamente.
        </p>
        <ol className="stop-list editable">
          {order.map((stop, i) => (
            <li key={stop}>
              <span>
                {names.get(stop) ??
                  `Local fora da demanda atual (posição ${i + 1})`}
              </span>
              <div className="actions">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={i === 0}
                  aria-label={`Subir parada ${i + 1}`}
                  onClick={() => move(i, -1)}
                >
                  <ArrowUp size={16} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={i === order.length - 1}
                  aria-label={`Descer parada ${i + 1}`}
                  onClick={() => move(i, 1)}
                >
                  <ArrowDown size={16} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setOrder((old) => old.filter((s) => s !== stop))
                  }
                >
                  Retirar
                </Button>
              </div>
            </li>
          ))}
        </ol>
        <Field label="Local para incluir">
          <select value={add} onChange={(e) => setAdd(e.target.value)}>
            <option value="">Selecione um local</option>
            {candidates.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
        <Button
          variant="outline"
          disabled={!add}
          onClick={() => {
            setOrder((old) => [...old, add]);
            setAdd("");
          }}
        >
          Incluir no fim
        </Button>
        <AsyncForm
          submit="Salvar ordem padrão"
          onSubmit={async () => {
            await api(`/groups/${id}/stop-order`, "PUT", {
              expectedVersion: view.order.version,
              stopIds: order,
            });
            reload();
          }}
        >
          <p className="muted">
            Ajuste a posição de cada local antes de salvar.
          </p>
        </AsyncForm>
      </details>
      <section className="itinerary-preview">
        <h2>Prévia da operação</h2>
        {view.needsAdjustment && (
          <Notice>Há mudança ou publicação pendente.</Notice>
        )}
        {!view.candidate.ordered.length && !view.candidate.pending.length && (
          <p className="muted">
            Nenhuma parada com passageiros confirmados neste grupo.
          </p>
        )}
        <ol className="stop-list">
          {view.candidate.ordered.map((s) => (
            <li key={s.id}>
              {s.label}
              {s.stopReference && <small>{s.stopReference}</small>}
              <small>{s.studentIds.length} passageiros</small>
            </li>
          ))}
        </ol>
        {view.candidate.pending.length > 0 && (
          <Notice>
            <strong>Sem posição definida</strong>
            <ul>
              {view.candidate.pending.map((s) => (
                <li key={s.id}>
                  {s.label}
                  {s.stopReference && <small>{s.stopReference}</small>}
                </li>
              ))}
            </ul>
          </Notice>
        )}
        <AsyncForm
          submit="Publicar itinerário do dia"
          disabled={
            dirty ||
            view.candidate.pending.length > 0 ||
            view.planning.status !== "confirmed" ||
            !view.order.version
          }
          onSubmit={async () => {
            await api(`/operations/groups/${id}/itinerary/publish`, "POST", {
              date: view.date,
              expectedVersion: view.version,
              previewToken: view.previewToken,
            });
            reload();
          }}
        >
          <label className="check">
            <input type="checkbox" required />
            Conferi a ordem e os locais confirmados.
          </label>
          {view.planning.status !== "confirmed" && (
            <p className="muted">Confirme a operação antes de publicar.</p>
          )}
        </AsyncForm>
      </section>
    </div>
  );
}
