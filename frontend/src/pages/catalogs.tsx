import { useState } from "react";
import { Plus, Pencil, CalendarDays } from "lucide-react";
import { all, api, label, today } from "../lib/api";
import type { Catalog, Vehicle } from "../lib/types";
import {
  AsyncForm,
  Dialog,
  Field,
  Heading,
  LoadState,
  Notice,
  Refresh,
  Table,
  useLoad,
  value,
  weekNames,
} from "../components/common";
import { Button } from "../components/ui/button";
import {
  PointAddressFields,
  pointAddressPayload,
  type PointAddressData,
} from "../components/point-address";
type Kind =
  | "groups"
  | "boarding-points"
  | "dropoff-points"
  | "vehicles"
  | "drivers";
type Row = PointAddressData & {
  id: string;
  version: number;
  active: boolean;
  name?: string;
  identifier?: string;
  plate?: string;
  kind?: string;
  seats?: number;
  phone?: string;
  direction?: string;
  groupId?: string;
  address?: string;
};
const titles: Record<Kind, string> = {
  groups: "Grupos",
  "boarding-points": "Pontos de embarque",
  "dropoff-points": "Pontos de desembarque",
  vehicles: "Veículos",
  drivers: "Motoristas",
};
export function Catalogs({ fleet = false }: { fleet?: boolean }) {
  const [kind, setKind] = useState<Kind>(fleet ? "vehicles" : "groups");
  const [edit, setEdit] = useState<Row | null | undefined>();
  const [availability, setAvailability] = useState<Row>();
  const state = useLoad(async () => {
    const [rows, groups] = await Promise.all([
      all<Row>(`/${kind}`),
      all<Catalog>("/groups"),
    ]);
    return { rows, groups };
  }, kind);
  return (
    <>
      <Heading
        title={fleet ? "Frota e motoristas" : "Grupos e locais"}
        description={
          fleet
            ? "Cadastre a frota e informe quando cada veículo está disponível."
            : "Grupos separados por sentido, com pontos de embarque e desembarque definidos pela equipe."
        }
      >
        <Refresh onClick={state.reload} />
        <Button onClick={() => setEdit(null)}>
          <Plus size={17} />
          Novo cadastro
        </Button>
      </Heading>
      <div className="tabs">
        {(fleet
          ? ["vehicles", "drivers"]
          : ["groups", "boarding-points", "dropoff-points"]
        ).map((k) => (
          <Button
            key={k}
            variant={kind === k ? "default" : "ghost"}
            onClick={() => {
              setKind(k as Kind);
              setEdit(undefined);
            }}
          >
            {titles[k as Kind]}
          </Button>
        ))}
      </div>
      <LoadState {...state} empty={!!state.data && !state.data.rows.length} />
      {state.data && state.data.rows.length > 0 && (
        <Table
          headers={["Nome / identificação", "Detalhes", "Situação", "Ações"]}
        >
          {state.data.rows.map((row) => (
            <tr key={row.id}>
              <td>
                <strong>{row.name ?? row.identifier}</strong>
              </td>
              <td>
                {row.plate
                  ? `${row.plate} · ${row.seats} lugares · ${label(row.kind ?? "")}`
                  : (row.phone ??
                    row.address ??
                    (row.direction
                      ? label(row.direction)
                      : (state.data!.groups.find((g) => g.id === row.groupId)
                          ?.name ?? "Grupo indisponível")))}
              </td>
              <td>
                <span className={`badge ${row.active ? "positive" : ""}`}>
                  {row.active ? "Ativo" : "Inativo"}
                </span>
              </td>
              <td className="row-actions">
                {kind === "vehicles" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAvailability(row)}
                  >
                    <CalendarDays size={16} />
                    Disponibilidade
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  aria-label={`Editar ${row.name ?? row.identifier}`}
                  onClick={() => setEdit(row)}
                >
                  <Pencil size={15} />
                </Button>
              </td>
            </tr>
          ))}
        </Table>
      )}
      {edit !== undefined && (
        <Dialog
          title={`${edit ? "Editar" : "Novo cadastro"} · ${titles[kind]}`}
          onClose={() => setEdit(undefined)}
        >
          <AsyncForm
            submit="Salvar cadastro"
            onSubmit={async (f) => {
              let body: Record<string, unknown>;
              if (kind === "vehicles")
                body = {
                  identifier: value(f, "identifier"),
                  plate: value(f, "plate"),
                  kind: value(f, "kind"),
                  seats: Number(value(f, "seats")),
                };
              else if (kind === "drivers")
                body = { name: value(f, "name"), phone: value(f, "phone") };
              else
                body = {
                  name: value(f, "name"),
                  ...(kind === "groups"
                    ? edit
                      ? {}
                      : { direction: value(f, "direction") }
                    : { groupId: value(f, "groupId") }),
                  ...(kind === "boarding-points" || kind === "dropoff-points"
                    ? pointAddressPayload(f)
                    : {}),
                };
              if (edit)
                body = {
                  ...body,
                  active: f.has("active"),
                  expectedVersion: edit.version,
                };
              await api(
                `/${kind}${edit ? "/" + edit.id : ""}`,
                edit ? "PATCH" : "POST",
                body,
              );
              setEdit(undefined);
              state.reload();
            }}
          >
            <div className="form-grid">
              {kind === "vehicles" ? (
                <>
                  <Field label="Identificação / número de frota">
                    <input
                      name="identifier"
                      defaultValue={edit?.identifier}
                      required
                      maxLength={100}
                    />
                  </Field>
                  <Field label="Placa">
                    <input
                      name="plate"
                      defaultValue={edit?.plate}
                      required
                      maxLength={20}
                    />
                  </Field>
                  <Field label="Tipo">
                    <select name="kind" defaultValue={edit?.kind ?? "van"}>
                      <option value="van">Van</option>
                      <option value="micro">Micro-ônibus</option>
                      <option value="bus">Ônibus</option>
                    </select>
                  </Field>
                  <Field label="Assentos de passageiros">
                    <input
                      type="number"
                      name="seats"
                      min={1}
                      max={2147483647}
                      defaultValue={edit?.seats}
                      required
                    />
                  </Field>
                </>
              ) : (
                <Field label="Nome">
                  <input
                    name="name"
                    defaultValue={edit?.name}
                    required
                    maxLength={200}
                  />
                </Field>
              )}
              {kind === "drivers" && (
                <Field label="Telefone com DDI">
                  <input
                    type="tel"
                    name="phone"
                    defaultValue={edit?.phone}
                    placeholder="+55 49 99999-9999"
                    required
                  />
                </Field>
              )}
              {kind === "groups" && !edit && (
                <Field label="Sentido">
                  <select name="direction">
                    <option value="pickup">Coleta / ida</option>
                    <option value="dropoff">Distribuição / volta</option>
                  </select>
                </Field>
              )}
              {(kind === "dropoff-points" || kind === "boarding-points") && (
                <Field label="Grupo">
                  <select
                    name="groupId"
                    defaultValue={edit?.groupId ?? ""}
                    required
                  >
                    <option value="">Selecione um grupo</option>
                    {state.data?.groups
                      .filter(
                        (g) =>
                          g.active &&
                          g.direction ===
                            (kind === "dropoff-points" ? "dropoff" : "pickup"),
                      )
                      .map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                  </select>
                </Field>
              )}
              {(kind === "boarding-points" || kind === "dropoff-points") && (
                <PointAddressFields key={edit?.id ?? "new"} point={edit} />
              )}
              {edit && (
                <label className="check">
                  <input
                    type="checkbox"
                    name="active"
                    defaultChecked={edit.active}
                  />
                  Ativo
                </label>
              )}
            </div>
          </AsyncForm>
        </Dialog>
      )}
      {availability && (
        <Dialog
          title={`Disponibilidade · ${availability.identifier}`}
          onClose={() => {
            setAvailability(undefined);
            state.reload();
          }}
        >
          <Availability id={availability.id} />
        </Dialog>
      )}
    </>
  );
}
function Availability({ id }: { id: string }) {
  const state = useLoad(
    () =>
      api<{ version: number; week: boolean[] | null }>(
        `/vehicles/${id}/availability`,
      ),
    id,
  );
  return (
    <>
      <LoadState {...state} />
      {state.data && (
        <AvailabilityEditor
          key={state.data.version}
          id={id}
          initial={state.data.week}
          version={state.data.version}
          reload={state.reload}
        />
      )}
    </>
  );
}
function AvailabilityEditor({
  id,
  initial,
  version,
  reload,
}: {
  id: string;
  initial: boolean[] | null;
  version: number;
  reload: () => void;
}) {
  const [week, setWeek] = useState<boolean[]>(initial ?? Array(7).fill(false));
  const [date, setDate] = useState(today());
  const exception = useLoad(
    () =>
      api<{ date: string; available: boolean }[]>(
        `/vehicles/${id}/availability/exceptions?from=${date}&to=${date}`,
      ),
    date + ":" + version,
  );
  return (
    <>
      {initial === null && (
        <Notice>
          Disponibilidade por dia ainda não configurada. Marque os dias
          disponíveis e salve a semana.
        </Notice>
      )}
      <AsyncForm
        submit="Salvar semana de disponibilidade"
        onSubmit={async () => {
          await api(`/vehicles/${id}/availability`, "PUT", {
            week,
            expectedVersion: version,
          });
          reload();
        }}
      >
        <fieldset>
          <legend>Dias disponíveis</legend>
          <div className="week-availability">
            {weekNames.map((name, day) => (
              <label className="check" key={name}>
                <input
                  type="checkbox"
                  checked={week[day]}
                  onChange={(e) =>
                    setWeek((old) =>
                      old.map((v, i) => (i === day ? e.target.checked : v)),
                    )
                  }
                />
                {name}
              </label>
            ))}
          </div>
        </fieldset>
        <p className="muted">
          Dias desmarcados ficam indisponíveis. O veículo pode atender etapas
          diferentes no mesmo dia.
        </p>
      </AsyncForm>
      <section className="inset">
        <h3>Exceção por data</h3>
        <Field label="Data da exceção">
          <input
            type="date"
            value={date}
            onChange={(e) => {
              if (e.target.value) setDate(e.target.value);
            }}
            required
          />
        </Field>
        <LoadState {...exception} />
        {exception.data && (
          <AsyncForm
            key={date + ":" + version}
            submit="Salvar exceção"
            onSubmit={async (f) => {
              const mode = value(f, "mode");
              await api(
                `/vehicles/${id}/availability/exceptions/${date}`,
                "PUT",
                {
                  expectedVersion: version,
                  available: mode === "week" ? null : mode === "yes",
                },
              );
              reload();
            }}
          >
            <Field label="Disponibilidade na data">
              <select
                name="mode"
                defaultValue={
                  exception.data.length
                    ? exception.data[0].available
                      ? "yes"
                      : "no"
                    : "week"
                }
              >
                <option value="week">Usar semana</option>
                <option value="yes">Disponível</option>
                <option value="no">Indisponível</option>
              </select>
            </Field>
            <p className="muted">
              A exceção substitui a semana apenas na data escolhida.
            </p>
          </AsyncForm>
        )}
      </section>
    </>
  );
}
