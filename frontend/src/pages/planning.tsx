import { useState } from "react";
import { api, all, dateLabel, label } from "../lib/api";
import type { Catalog, Driver, Planning, Trip, Vehicle } from "../lib/types";
import {
  AsyncForm,
  Badge,
  Field,
  Heading,
  LoadState,
  Notice,
  Refresh,
  useLoad,
} from "../components/common";
import { Button } from "../components/ui/button";
import { GroupOrder } from "./itineraries";

type Stage = "collection" | "distribution" | "intermunicipal";
const tabs: { stage: Stage; name: string; route: string }[] = [
  {
    stage: "collection",
    name: "Ida",
    route: "Pontos de embarque → Fiscalização",
  },
  {
    stage: "distribution",
    name: "Volta",
    route: "Fiscalização → Pontos de desembarque",
  },
  {
    stage: "intermunicipal",
    name: "Intermunicipal",
    route: "Fiscalização ↔ Unimater / Unidep",
  },
];
function wire(t: Trip) {
  return t.stage === "intermunicipal"
    ? {
        kind: "intermunicipal",
        vehicleId: t.vehicleId,
        universityId: t.universityId,
        outbound: { driverId: t.legs[0].driverId },
        return: { driverId: t.legs[1].driverId },
      }
    : {
        kind: "local",
        vehicleId: t.vehicleId,
        groupId: t.groupId,
        stage: t.stage,
        driverId: t.legs[0].driverId,
      };
}
export function DailyItinerary() {
  const [stage, setStage] = useState<Stage>("collection");
  const [group, setGroup] = useState("");
  const state = useLoad(async () => {
    const [planning, vehicles, drivers, groups] = await Promise.all([
      api<Planning>("/operations/current"),
      all<Vehicle>("/vehicles"),
      all<Driver>("/drivers"),
      all<Catalog>("/groups"),
    ]);
    const day = new Date(planning.date + "T12:00:00Z").getUTCDay();
    const availability = Object.fromEntries(
      await Promise.all(
        vehicles.map(async (v) => {
          const exceptions = await api<{ available: boolean }[]>(
            `/vehicles/${v.id}/availability/exceptions?from=${planning.date}&to=${planning.date}`,
          );
          return [v.id, exceptions[0]?.available ?? v.week?.[day] ?? false];
        }),
      ),
    );
    return { planning, vehicles, drivers, groups, availability };
  });
  return (
    <>
      <Heading
        title="Itinerários"
        description="Organize as viagens do dia, escolha os veículos e confira as paradas."
      />
      <div
        className="itinerary-tabs"
        role="tablist"
        aria-label="Etapas da operação"
      >
        {tabs.map((tab) => (
          <button
            key={tab.stage}
            type="button"
            role="tab"
            id={`tab-${tab.stage}`}
            aria-controls="itinerary-stage"
            aria-selected={stage === tab.stage}
            tabIndex={stage === tab.stage ? 0 : -1}
            onClick={() => {
              setStage(tab.stage);
              setGroup("");
            }}
            onKeyDown={(e) => {
              const i = tabs.findIndex((t) => t.stage === stage);
              const next =
                e.key === "ArrowRight"
                  ? (i + 1) % 3
                  : e.key === "ArrowLeft"
                    ? (i + 2) % 3
                    : e.key === "Home"
                      ? 0
                      : e.key === "End"
                        ? 2
                        : -1;
              if (next >= 0) {
                e.preventDefault();
                setStage(tabs[next].stage);
                setGroup("");
                document.getElementById(`tab-${tabs[next].stage}`)?.focus();
              }
            }}
          >
            {tab.name}
            <small>{tab.route}</small>
          </button>
        ))}
      </div>
      <LoadState {...state} />
      {state.data && (
        <PlanEditor
          key={`${state.data.planning.date}-${state.data.planning.version}-${state.data.planning.demandToken}`}
          {...state.data}
          stage={stage}
          group={group}
          setGroup={setGroup}
          reload={state.reload}
        />
      )}
    </>
  );
}
function PlanEditor({
  planning,
  vehicles,
  drivers,
  groups,
  availability,
  stage,
  group,
  setGroup,
  reload,
}: {
  planning: Planning;
  vehicles: Vehicle[];
  drivers: Driver[];
  groups: Catalog[];
  availability: Record<string, boolean>;
  stage: Stage;
  group: string;
  setGroup: (id: string) => void;
  reload: () => void;
}) {
  const [draft, setDraft] = useState<Trip[]>(planning.plan?.draft ?? []);
  const dirty =
    JSON.stringify(draft) !== JSON.stringify(planning.plan?.draft ?? []);
  const direction = stage === "collection" ? "pickup" : "dropoff";
  const shownGroups = groups.filter(
    (g) =>
      g.direction === direction &&
      (g.active ||
        draft.some((t) => t.groupId === g.id) ||
        planning.groups?.some((d) => d.groupId === g.id)),
  );
  const items =
    stage === "intermunicipal"
      ? planning.universities.map((u) => ({
          id: u.universityId,
          name: label(u.universityId),
          count: u.required,
          detail: `${u.pickup} ida / ${u.dropoff} volta`,
          active: true,
        }))
      : shownGroups
          .filter((g) => !group || g.id === group)
          .map((g) => ({
            id: g.id,
            name: g.name,
            count:
              planning.groups?.find(
                (d) => d.groupId === g.id && d.stage === stage,
              )?.count ?? 0,
            detail: g.active
              ? "Grupo local"
              : "Grupo inativo · revise a atribuição",
            active: g.active,
          }));
  function change(id: string, trip?: Trip) {
    setDraft((old) => [
      ...old.filter(
        (t) => !(t.stage === stage && (t.groupId ?? t.universityId) === id),
      ),
      ...(trip ? [trip] : []),
    ]);
  }
  return (
    <>
      <div className="toolbar">
        <span>
          Operação de <strong>{dateLabel(planning.date)}</strong>
        </span>
        <Badge value={planning.status} />
        <Refresh disabled={dirty} onClick={reload} />
      </div>
      {(planning.issues.length > 0 || planning.planningIssues.length > 0) && (
        <Notice>
          <strong>Ajustes necessários</strong>
          <ul>
            {[
              ...new Set([
                ...planning.issues.map((i) => i.code),
                ...planning.planningIssues,
              ]),
            ].map((code) => (
              <li key={code}>{label(code)}</li>
            ))}
          </ul>
        </Notice>
      )}
      <section
        role="tabpanel"
        id="itinerary-stage"
        aria-labelledby={`tab-${stage}`}
      >
        {stage !== "intermunicipal" && (
          <div className="group-filter">
            <Field label="Grupo">
              <select value={group} onChange={(e) => setGroup(e.target.value)}>
                <option value="">Todos os grupos</option>
                {shownGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        )}
        {!items.length && (
          <p className="empty">
            Nenhum grupo neste sentido. Cadastre os grupos em Grupos e locais.
          </p>
        )}
        <div className="itinerary-groups">
          {items.map((item) => {
            const selected = draft.filter(
              (t) =>
                t.stage === stage && (t.groupId ?? t.universityId) === item.id,
            );
            const trip = selected[0];
            return (
              <section
                className="operation-group"
                key={`${stage}:${item.id}`}
                aria-label={item.name}
              >
                <header className="group-heading">
                  <div>
                    <h2>{item.name}</h2>
                    <p className="muted">{item.detail}</p>
                  </div>
                  <div className="passenger-count">
                    <strong>{item.count}</strong>
                    <span>passageiros</span>
                  </div>
                </header>
                {selected.length > 1 && (
                  <Notice>
                    Há mais de uma atribuição neste grupo. Escolha novamente o
                    veículo para substituir as duplicadas.
                  </Notice>
                )}
                <Assignment
                  stage={stage}
                  id={item.id}
                  trip={trip}
                  count={item.count}
                  active={item.active}
                  draft={draft}
                  vehicles={vehicles}
                  drivers={drivers}
                  availability={availability}
                  onChange={(t) => change(item.id, t)}
                />
                {stage === "intermunicipal" ? (
                  <>
                    <section className="intermunicipal-preview">
                      <h3>Prévia da operação</h3>
                      <ol className="stop-list">
                        <li>Ida: Fiscalização → {item.name}</li>
                        <li>Volta: {item.name} → Fiscalização</li>
                      </ol>
                      <p className="muted">
                        O mesmo veículo faz a ida e a volta.
                      </p>
                    </section>
                    <Recommendation
                      universityId={item.id}
                      draft={draft}
                      vehicles={vehicles}
                      onSelect={(vehicleId) =>
                        change(item.id, {
                          stage,
                          universityId: item.id,
                          vehicleId,
                          legs: trip?.legs ?? [
                            { driverId: "" },
                            { driverId: "" },
                          ],
                        })
                      }
                    />
                  </>
                ) : (
                  <GroupOrder id={item.id} />
                )}
              </section>
            );
          })}
        </div>
      </section>
      <section className="operation-actions" aria-label="Salvar operação">
        <div>
          <h2>Escolhas da operação</h2>
          <p className="muted">
            Salve as escolhas das três abas. Confirme a operação após o
            fechamento das 17h e a resolução das pendências.
          </p>
        </div>
        {dirty && <Notice>Há escolhas ainda não salvas.</Notice>}
        <AsyncForm
          submit="Salvar rascunho"
          onSubmit={async () => {
            if (
              draft.some((t) => !t.vehicleId || t.legs.some((l) => !l.driverId))
            )
              throw new Error(
                "Selecione os motoristas de todas as viagens antes de salvar.",
              );
            await api("/operations/current/planning", "PUT", {
              expectedVersion: planning.version,
              demandToken: planning.demandToken,
              trips: draft.map(wire),
            });
            reload();
          }}
        >
          <p className="muted">
            As escolhas confirmadas continuam valendo até uma nova confirmação
            válida.
          </p>
        </AsyncForm>
        <AsyncForm
          submit="Confirmar operação"
          disabled={
            dirty ||
            !planning.plan ||
            planning.closingPending ||
            !!planning.issues.length ||
            !!planning.planningIssues.length
          }
          onSubmit={async () => {
            await api("/operations/current/planning/confirm", "POST", {
              expectedVersion: planning.version,
              demandToken: planning.demandToken,
            });
            reload();
          }}
        >
          <label className="check">
            <input type="checkbox" required />
            Revisei os veículos e motoristas das três abas.
          </label>
        </AsyncForm>
      </section>
    </>
  );
}
function Assignment({
  stage,
  id,
  trip,
  count,
  active,
  draft,
  vehicles,
  drivers,
  availability,
  onChange,
}: {
  stage: Stage;
  id: string;
  trip?: Trip;
  count: number;
  active: boolean;
  draft: Trip[];
  vehicles: Vehicle[];
  drivers: Driver[];
  availability: Record<string, boolean>;
  onChange: (t?: Trip) => void;
}) {
  const other = draft.filter(
    (t) => t.stage === stage && (t.groupId ?? t.universityId) !== id,
  );
  const choices = vehicles.filter(
    (v) =>
      v.active &&
      availability[v.id] &&
      v.seats >= count &&
      !other.some((t) => t.vehicleId === v.id),
  );
  const selectedInvalid = trip && !choices.some((v) => v.id === trip.vehicleId);
  function vehicle(vehicleId: string) {
    if (!vehicleId) {
      onChange(undefined);
      return;
    }
    onChange({
      stage,
      vehicleId,
      ...(stage === "intermunicipal" ? { universityId: id } : { groupId: id }),
      legs:
        trip?.legs ??
        (stage === "intermunicipal"
          ? [{ driverId: "" }, { driverId: "" }]
          : [{ driverId: "" }]),
    });
  }
  return (
    <div className="assignment">
      <div className="form-grid">
        <Field label="Veículo">
          <select
            value={trip?.vehicleId ?? ""}
            onChange={(e) => vehicle(e.target.value)}
          >
            <option value="">Sem veículo atribuído</option>
            {selectedInvalid && (
              <option value={trip.vehicleId}>
                {vehicles.find((v) => v.id === trip.vehicleId)?.identifier ??
                  "Veículo não encontrado"}{" "}
                · requer revisão
              </option>
            )}
            {choices.map((v) => (
              <option key={v.id} value={v.id} disabled={!active}>
                {v.identifier} · {v.seats} lugares
              </option>
            ))}
          </select>
        </Field>
        {trip?.legs.map((leg, i) => (
          <Field
            key={i}
            label={
              stage === "intermunicipal"
                ? i === 0
                  ? "Motorista da ida"
                  : "Motorista da volta"
                : "Motorista"
            }
          >
            <select
              value={leg.driverId}
              onChange={(e) =>
                onChange({
                  ...trip,
                  legs: trip.legs.map((l, j) =>
                    i === j ? { driverId: e.target.value } : l,
                  ),
                })
              }
            >
              <option value="">Selecione</option>
              {leg.driverId &&
                !drivers.some((d) => d.id === leg.driverId && d.active) && (
                  <option value={leg.driverId}>Motorista indisponível</option>
                )}
              {drivers
                .filter((d) => d.active)
                .map((d) => (
                  <option
                    key={d.id}
                    value={d.id}
                    disabled={other.some((t) => t.legs[i]?.driverId === d.id)}
                  >
                    {d.name}
                  </option>
                ))}
            </select>
          </Field>
        ))}
      </div>
      {selectedInvalid && (
        <Notice>
          Confira disponibilidade, capacidade e atribuições deste veículo.
        </Notice>
      )}
      {!choices.length && (
        <p className="muted">
          Nenhum veículo disponível e suficiente. Revise a frota ou as
          atribuições desta etapa.
        </p>
      )}
    </div>
  );
}
function Recommendation({
  universityId,
  draft,
  vehicles,
  onSelect,
}: {
  universityId: string;
  draft: Trip[];
  vehicles: Vehicle[];
  onSelect: (id: string) => void;
}) {
  const state = useLoad(
    () =>
      api<{ available: Vehicle[]; required: number }>(
        "/operations/current/vehicle-options",
        "POST",
        { universityId },
      ),
    universityId,
  );
  const available = (state.data?.available ?? []).filter(
    (v) =>
      !draft.some(
        (t) =>
          t.stage === "intermunicipal" &&
          t.universityId !== universityId &&
          t.vehicleId === v.id,
      ),
  );
  const minimum = available.length
    ? Math.min(...available.map((v) => v.seats))
    : 0;
  return (
    <section className="vehicle-recommendation">
      <h3>Sugestão do sistema</h3>
      <p className="muted">
        Menor veículo disponível para o maior número entre ida e volta. Você
        também pode escolher um maior.
      </p>
      <LoadState {...state} />
      {state.data &&
        (available.length ? (
          <div className="actions">
            {available
              .filter((v) => v.seats === minimum)
              .map((v) => (
                <Button
                  key={v.id}
                  variant="outline"
                  onClick={() => onSelect(v.id)}
                >
                  Usar{" "}
                  {vehicles.find((x) => x.id === v.id)?.identifier ??
                    v.identifier}{" "}
                  · {v.seats} lugares
                </Button>
              ))}
          </div>
        ) : (
          <Notice>Nenhuma sugestão disponível para a demanda atual.</Notice>
        ))}
    </section>
  );
}
