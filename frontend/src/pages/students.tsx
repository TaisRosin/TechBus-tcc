import { useState } from "react";
import { Plus, Search, Pencil } from "lucide-react";
import { api, all, label, today } from "../lib/api";
import type { Student, Contract, Catalog } from "../lib/types";
import {
  AsyncForm,
  Days,
  Dialog,
  Field,
  Heading,
  LoadState,
  Refresh,
  Table,
  days,
  useLoad,
  value,
} from "../components/common";
import { Button } from "../components/ui/button";

export function Students() {
  const state = useLoad(() => all<Student>("/students"));
  const [search, setSearch] = useState("");
  const [edit, setEdit] = useState<Student | null | undefined>();
  const [details, setDetails] = useState<Student>();
  const rows = (state.data ?? []).filter((s) =>
    `${s.name} ${s.phone}`
      .toLocaleLowerCase()
      .includes(search.toLocaleLowerCase()),
  );
  return (
    <>
      <Heading
        title="Alunos"
        description="Cadastros, vigências e locais habituais."
      >
        <Refresh onClick={state.reload} disabled={state.loading} />
        <Button onClick={() => setEdit(null)}>
          <Plus size={17} />
          Novo aluno
        </Button>
      </Heading>
      <div className="toolbar">
        <label className="search">
          <Search size={18} />
          <input
            aria-label="Buscar aluno"
            placeholder="Buscar por nome ou telefone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <span>{rows.length} alunos</span>
      </div>
      <LoadState {...state} empty={!!state.data && !rows.length} />
      {rows.length > 0 && (
        <Table
          headers={[
            "Aluno",
            "Universidade",
            "WhatsApp",
            "Dias habituais",
            "Situação",
            "Ações",
          ]}
        >
          {rows.map((s) => (
            <tr key={s.id}>
              <td>
                <strong>{s.name}</strong>
              </td>
              <td>{label(s.universityId)}</td>
              <td>{s.phone}</td>
              <td>
                {s.habitualDays.length
                  ? s.habitualDays
                      .map(
                        (d) =>
                          ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][d],
                      )
                      .join(", ")
                  : "Somente extra"}
              </td>
              <td>
                <span className={`badge ${s.active ? "positive" : ""}`}>
                  {s.active ? "Ativo" : "Inativo"}
                </span>
              </td>
              <td className="row-actions">
                <Button variant="ghost" size="sm" onClick={() => setDetails(s)}>
                  Vigência e locais
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEdit(s)}
                  aria-label={`Editar ${s.name}`}
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
          title={edit ? "Editar aluno" : "Novo aluno"}
          onClose={() => setEdit(undefined)}
        >
          <AsyncForm
            submit="Salvar aluno"
            onSubmit={async (f) => {
              const fields = {
                name: value(f, "name"),
                phone: value(f, "phone"),
                universityId: value(f, "universityId"),
                habitualDays: days(f),
              };
              await api(
                edit ? `/students/${edit.id}` : "/students",
                edit ? "PATCH" : "POST",
                edit
                  ? {
                      ...fields,
                      active: f.has("active"),
                      expectedVersion: edit.version,
                    }
                  : {
                      ...fields,
                      contract: {
                        startDate: value(f, "start"),
                        endDate: value(f, "end"),
                      },
                    },
              );
              setEdit(undefined);
              state.reload();
            }}
          >
            <div className="form-grid">
              <Field label="Nome completo">
                <input
                  name="name"
                  defaultValue={edit?.name}
                  maxLength={200}
                  required
                  autoFocus
                />
              </Field>
              <Field label="WhatsApp" hint="Inclua +55 e o DDD.">
                <input
                  name="phone"
                  type="tel"
                  placeholder="+55 49 99999-9999"
                  defaultValue={edit?.phone}
                  required
                />
              </Field>
              <Field label="Universidade">
                <select
                  name="universityId"
                  defaultValue={edit?.universityId ?? "unimater"}
                >
                  <option value="unimater">Unimater</option>
                  <option value="unidep">Unidep</option>
                </select>
              </Field>
              {edit ? (
                <label className="check">
                  <input
                    type="checkbox"
                    name="active"
                    defaultChecked={edit.active}
                  />
                  Cadastro ativo
                </label>
              ) : (
                <>
                  <Field label="Início da vigência">
                    <input
                      type="date"
                      name="start"
                      defaultValue={today()}
                      required
                    />
                  </Field>
                  <Field label="Fim da vigência">
                    <input type="date" name="end" required />
                  </Field>
                </>
              )}
            </div>
            <Days selected={edit?.habitualDays} />
            <p className="muted">
              Nenhum dia marcado permite uso somente extra, respeitando
              calendário e vigência.
            </p>
          </AsyncForm>
        </Dialog>
      )}
      {details && (
        <Dialog title={details.name} onClose={() => setDetails(undefined)}>
          <StudentDetails student={details} />
        </Dialog>
      )}
    </>
  );
}
interface Defaults {
  pickup: {
    value: { version: number; pointId: string } | null;
    usable: boolean;
    issue: string | null;
  };
  dropoff: {
    value: { version: number; locationId: string } | null;
    usable: boolean;
    issue: string | null;
  };
}
function StudentDetails({ student }: { student: Student }) {
  const state = useLoad(async () => {
    const [contracts, defaults, points, dropoffPoints] = await Promise.all([
      api<Contract[]>(`/students/${student.id}/contracts`),
      api<Defaults>(`/students/${student.id}/location-defaults`),
      all<Catalog>("/boarding-points"),
      all<Catalog>("/dropoff-points"),
    ]);
    return { contracts, defaults, points, dropoffPoints };
  }, student.id);
  const [contract, setContract] = useState<Contract | null | undefined>();
  return (
    <>
      <LoadState {...state} />
      {state.data && (
        <>
          <h3>Vigências</h3>
          <Table headers={["Início", "Fim", "Ação"]}>
            {state.data.contracts.map((c) => (
              <tr key={c.id}>
                <td>{c.startDate}</td>
                <td>{c.endDate}</td>
                <td>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setContract(c)}
                  >
                    Editar vigência
                  </Button>
                </td>
              </tr>
            ))}
          </Table>
          <Button variant="outline" onClick={() => setContract(null)}>
            Adicionar vigência
          </Button>
          {contract !== undefined && (
            <section className="inset">
              <h3>{contract ? "Editar vigência" : "Nova vigência"}</h3>
              <AsyncForm
                submit="Salvar vigência"
                onSubmit={async (f) => {
                  const body = {
                    startDate: value(f, "start"),
                    endDate: value(f, "end"),
                  };
                  await api(
                    contract
                      ? `/contracts/${contract.id}`
                      : `/students/${student.id}/contracts`,
                    contract ? "PATCH" : "POST",
                    contract
                      ? { ...body, expectedVersion: contract.version }
                      : body,
                  );
                  setContract(undefined);
                  state.reload();
                }}
              >
                <div className="form-grid">
                  <Field label="Início da vigência">
                    <input
                      type="date"
                      name="start"
                      defaultValue={contract?.startDate}
                      required
                    />
                  </Field>
                  <Field label="Fim da vigência">
                    <input
                      type="date"
                      name="end"
                      defaultValue={contract?.endDate}
                      required
                    />
                  </Field>
                </div>
              </AsyncForm>
              <Button variant="ghost" onClick={() => setContract(undefined)}>
                Cancelar edição
              </Button>
            </section>
          )}
          <h3>Locais habituais</h3>
          <p className="muted">
            Alterações aqui mudam o padrão do cadastro. A jornada já registrada
            não é alterada.
          </p>
          {(["pickup", "dropoff"] as const).map((side) => {
            const defaults = state.data!.defaults[side];
            return (
              <section className="inset" key={side}>
                <h3>{side === "pickup" ? "Embarque" : "Desembarque"}</h3>
                <p>
                  {defaults.usable
                    ? "Padrão configurado"
                    : label(defaults.issue ?? "NOT_CONFIGURED")}
                </p>
                <AsyncForm
                  key={`${side}-${defaults.value?.version ?? 0}`}
                  submit="Salvar padrão"
                  onSubmit={async (f) => {
                    await api(
                      `/students/${student.id}/location-defaults/${side}`,
                      "PUT",
                      {
                        [side === "pickup" ? "pointId" : "locationId"]: value(
                          f,
                          "place",
                        ),
                        source: defaults.value ? "request" : "initial",
                        evidence: value(f, "evidence"),
                        expectedVersion: defaults.value?.version ?? 0,
                      },
                    );
                    state.reload();
                  }}
                >
                  <Field
                    label={
                      side === "pickup"
                        ? "Ponto de embarque"
                        : "Ponto de desembarque"
                    }
                  >
                    {
                      <select
                        name="place"
                        defaultValue={
                          (side === "pickup"
                            ? state.data!.defaults.pickup.value?.pointId
                            : state.data!.defaults.dropoff.value?.locationId) ??
                          ""
                        }
                        required
                      >
                        <option value="">Selecione um ponto</option>
                        {(side === "pickup"
                          ? state.data!.points
                          : state.data!.dropoffPoints
                        )
                          .filter((p) => p.active)
                          .map((p) => (
                            <option value={p.id} key={p.id}>
                              {p.name}
                            </option>
                          ))}
                      </select>
                    }
                  </Field>
                  <Field
                    label="Registro do pedido"
                    hint="Informe o pedido explícito do aluno ou a origem do cadastro inicial."
                  >
                    <textarea name="evidence" required maxLength={1000} />
                  </Field>
                </AsyncForm>
              </section>
            );
          })}
        </>
      )}
    </>
  );
}
