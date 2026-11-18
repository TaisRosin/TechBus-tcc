import { useMemo, useRef, useState } from "react";
import { all, api, label } from "../lib/api";
import type { Catalog } from "../lib/types";
import {
  AsyncForm,
  Field,
  Heading,
  LoadState,
  Notice,
  useLoad,
  value,
} from "../components/common";
import { Button } from "../components/ui/button";
import { RouteMap } from "../components/route-map";

interface Location {
  placeId: string;
  lat: number;
  lng: number;
  address: string;
  approximate: boolean;
}
interface Points {
  ordered: Catalog[];
  pending: Catalog[];
  token: string;
}
interface Route {
  distanceMeters: number;
  durationSeconds: number;
  polyline: string;
}
export function MapsPage() {
  const groups = useLoad(() => all<Catalog>("/groups"));
  const [groupId, setGroupId] = useState("");
  const [mode, setMode] = useState("today");
  return (
    <>
      <Heading
        title="Mapa e rotas"
        description="Confira as paradas e visualize o percurso na ordem definida pela equipe."
      />
      <LoadState {...groups} />
      <div className="form-grid">
        <Field label="Grupo do percurso">
          <select
            value={groupId}
            onChange={(event) => setGroupId(event.target.value)}
          >
            <option value="">Selecione</option>
            <option value="direct">Trecho direto / intermunicipal</option>
            {groups.data
              ?.filter((group) => group.active)
              .map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name} · {label(group.direction ?? "")}
                </option>
              ))}
          </select>
        </Field>
        {groupId !== "direct" && (
          <Field label="Paradas do percurso">
            <select
              value={mode}
              onChange={(event) => setMode(event.target.value)}
            >
              <option value="today">Passageiros confirmados hoje</option>
              <option value="catalog">Pontos cadastrados do grupo</option>
            </select>
          </Field>
        )}
      </div>
      {groupId ? (
        <GroupMap
          key={groupId + mode}
          groupId={groupId}
          mode={groupId === "direct" ? "direct" : mode}
        />
      ) : (
        <RouteMap points={[]} />
      )}
    </>
  );
}
function GroupMap({ groupId, mode }: { groupId: string; mode: string }) {
  const state = useLoad(
    () => api<Points>(`/maps/groups/${groupId}?mode=${mode}`),
    groupId + mode,
  );
  return (
    <>
      <LoadState {...state} />
      {state.data && (
        <RouteEditor
          key={state.data.token}
          groupId={groupId}
          mode={mode}
          data={state.data}
          reload={state.reload}
        />
      )}
    </>
  );
}
function RouteEditor({
  groupId,
  mode,
  data,
  reload,
}: {
  groupId: string;
  mode: string;
  data: Points;
  reload: () => void;
}) {
  const [locations, setLocations] = useState<
    Record<string, Location | undefined>
  >({});
  const revision = useRef(0);
  const [confirmed, setConfirmed] = useState(false);
  const [route, setRoute] = useState<Route>();
  const entries = useMemo(
    () =>
      mode === "direct"
        ? [
            {
              id: "origin",
              name: "Origem — garagem ou início da etapa",
              address: "",
            },
            ...data.ordered,
            ...data.pending,
            {
              id: "destination",
              name: "Destino — final da etapa",
              address: "",
            },
          ]
        : [...data.ordered, ...data.pending],
    [data, mode],
  );
  const points = useMemo(
    () =>
      entries.flatMap((entry) =>
        locations[entry.id]
          ? [{ ...locations[entry.id]!, label: entry.name }]
          : [],
      ),
    [entries, locations],
  );
  const ready =
    entries.length >= 2 &&
    entries.every((entry) => locations[entry.id]) &&
    confirmed &&
    !data.pending.length &&
    entries.length <= 27;
  function select(id: string, location?: Location) {
    revision.current++;
    setLocations((previous) => ({ ...previous, [id]: location }));
    setConfirmed(false);
    setRoute(undefined);
  }
  return (
    <>
      <div className="toolbar">
        <Button variant="outline" onClick={reload}>
          Atualizar pontos e ordem
        </Button>
      </div>
      {!!data.pending.length && (
        <Notice>
          Há {data.pending.length} pontos sem posição. Defina a ordem no
          itinerário do grupo para calcular o percurso.
        </Notice>
      )}
      {entries.length > 27 && (
        <Notice>
          Este percurso excede o limite de 25 paradas intermediárias por
          cálculo.
        </Notice>
      )}
      {mode === "today" && !data.ordered.length && !data.pending.length && (
        <Notice>
          Defina a ordem dos pontos do grupo para visualizar o percurso.
        </Notice>
      )}
      {mode !== "direct" && (
        <p className="muted">
          A rota começa no primeiro ponto e termina no último da ordem do grupo,
          mesmo sem passageiros nesses pontos.
        </p>
      )}
      {mode !== "direct" &&
        data.ordered.length === 1 &&
        !data.pending.length && (
          <Notice>
            O grupo tem apenas um ponto na rota. São necessários dois pontos
            para calcular o percurso.
          </Notice>
        )}
      <RouteMap points={points} polyline={route?.polyline} />
      {route && (
        <p role="status">
          <strong>
            {(route.distanceMeters / 1000).toLocaleString("pt-BR", {
              maximumFractionDigits: 1,
            })}{" "}
            km · aproximadamente {Math.ceil(route.durationSeconds / 60)} minutos
          </strong>
        </p>
      )}
      <p className="muted">
        Confira a entrada e o lado da rua de cada parada. A estimativa considera
        condução e não inclui tempo de embarque ou acompanhamento ao vivo do
        ônibus. A equipe deve conferir a adequação do caminho ao veículo.
      </p>
      <ol className="stop-list">
        {entries.map((entry) => (
          <li key={entry.id}>
            <LocationSearch
              title={
                mode === "direct"
                  ? entry.name
                  : entry.id === data.ordered[0]?.id
                    ? `Origem — ${entry.name}`
                    : entry.id === data.ordered.at(-1)?.id
                      ? `Destino — ${entry.name}`
                      : entry.name
              }
              initial={entry.address ?? ""}
              onSelect={(location) => select(entry.id, location)}
            />
          </li>
        ))}
      </ol>
      <label className="check">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(event) => {
            revision.current++;
            setConfirmed(event.target.checked);
            setRoute(undefined);
          }}
        />
        Conferi os locais no mapa para esta prévia
      </label>
      <AsyncForm
        submit="Calcular percurso"
        success="Percurso calculado."
        disabled={!ready}
        onSubmit={async () => {
          setRoute(undefined);
          const requestedRevision = revision.current;
          const result = await api<Route>("/maps/route", "POST", {
            groupId,
            mode,
            token: data.token,
            locations: entries.map((entry) => ({
              ...locations[entry.id]!,
              pointId: ["origin", "destination"].includes(entry.id)
                ? null
                : entry.id,
            })),
          });
          if (requestedRevision === revision.current) setRoute(result);
        }}
      >
        <span />
      </AsyncForm>
    </>
  );
}
function LocationSearch({
  title,
  initial,
  onSelect,
}: {
  title: string;
  initial: string;
  onSelect: (location?: Location) => void;
}) {
  const [address, setAddress] = useState(initial);
  const [candidates, setCandidates] = useState<Location[]>();
  const [selected, setSelected] = useState("");
  return (
    <section>
      <AsyncForm
        submit="Localizar no mapa"
        success="Busca concluída. Confira o resultado abaixo."
        onSubmit={async (form) => {
          setCandidates(undefined);
          setSelected("");
          onSelect(undefined);
          const result = await api<{ candidates: Location[] }>(
            "/maps/geocode",
            "POST",
            { address: value(form, "address") },
          );
          setCandidates(result.candidates);
        }}
      >
        <Field label={title}>
          <input
            name="address"
            value={address}
            maxLength={1000}
            required
            onChange={(event) => {
              setAddress(event.target.value);
              setCandidates(undefined);
              setSelected("");
              onSelect(undefined);
            }}
          />
        </Field>
      </AsyncForm>
      {candidates?.length === 0 && (
        <Notice>
          Endereço não encontrado. Acrescente cidade, UF ou corrija o
          logradouro.
        </Notice>
      )}
      {!!candidates?.length && (
        <Field label={`Local encontrado para ${title}`}>
          <select
            value={selected}
            onChange={(event) => {
              setSelected(event.target.value);
              onSelect(
                candidates.find(
                  (candidate) => candidate.placeId === event.target.value,
                ),
              );
            }}
          >
            <option value="">Selecione e confira no mapa</option>
            {candidates.map((candidate) => (
              <option key={candidate.placeId} value={candidate.placeId}>
                {candidate.address}
                {candidate.approximate ? " · localização aproximada" : ""}
              </option>
            ))}
          </select>
        </Field>
      )}
    </section>
  );
}
