import { useState } from "react";
import { api, label, today } from "../lib/api";
import {
  AsyncForm,
  Days,
  Field,
  Heading,
  LoadState,
  Refresh,
  Table,
  days,
  useLoad,
  value,
} from "../components/common";
interface Calendar {
  days: number[] | null;
  version: number;
}
interface Exception {
  date: string;
  operates: boolean | null;
  reason: string;
}
export function CalendarPage() {
  const [university, setUniversity] = useState("unimater");
  const [range, setRange] = useState({ from: today(), to: today() });
  const state = useLoad(async () => {
    const [calendar, exceptions] = await Promise.all([
      api<Calendar>(`/universities/${university}/calendar`),
      api<{ exceptions: Exception[] }>(
        `/universities/${university}/calendar/exceptions?from=${range.from}&to=${range.to}`,
      ),
    ]);
    return { calendar, exceptions: exceptions.exceptions };
  }, `${university}-${range.from}-${range.to}`);
  return (
    <>
      <Heading
        title="Calendários"
        description="Defina quando cada universidade tem operação. Exceções por data prevalecem sobre a semana."
      >
        <Refresh onClick={state.reload} />
      </Heading>
      <div className="toolbar">
        <Field label="Universidade">
          <select
            value={university}
            onChange={(e) => setUniversity(e.target.value)}
          >
            <option value="unimater">Unimater</option>
            <option value="unidep">Unidep</option>
          </select>
        </Field>
      </div>
      <LoadState {...state} />
      {state.data && (
        <div className="columns">
          <section className="panel">
            <h2>Semana de {label(university)}</h2>
            <p className="muted">
              {state.data.calendar.days === null
                ? "Sem configuração: a operação não é presumida."
                : "Marque os dias em que há transporte."}
            </p>
            <AsyncForm
              key={`${university}-${state.data.calendar.version}`}
              submit="Salvar semana"
              onSubmit={async (f) => {
                await api(`/universities/${university}/calendar`, "PATCH", {
                  days: days(f),
                  expectedVersion: state.data!.calendar.version,
                });
                state.reload();
              }}
            >
              <Days selected={state.data.calendar.days ?? []} />
            </AsyncForm>
          </section>
          <section className="panel">
            <h2>Exceção por data</h2>
            <AsyncForm
              submit="Salvar exceção"
              onSubmit={async (f) => {
                await api(
                  `/universities/${university}/calendar/exceptions/${value(f, "date")}`,
                  "PUT",
                  {
                    operates:
                      value(f, "operates") === "week"
                        ? null
                        : value(f, "operates") === "yes",
                    reason: value(f, "reason"),
                    expectedVersion: state.data!.calendar.version,
                  },
                );
                state.reload();
              }}
            >
              <Field label="Data">
                <input
                  type="date"
                  name="date"
                  defaultValue={today()}
                  required
                />
              </Field>
              <Field label="Operação">
                <select name="operates">
                  <option value="no">Sem transporte</option>
                  <option value="yes">Com transporte</option>
                  <option value="week">Voltar à programação semanal</option>
                </select>
              </Field>
              <Field label="Motivo">
                <textarea name="reason" required maxLength={500} />
              </Field>
            </AsyncForm>
          </section>
        </div>
      )}
      <section className="panel">
        <h2>Consultar exceções</h2>
        <div className="toolbar">
          <Field label="De">
            <input
              type="date"
              value={range.from}
              onChange={(e) => {
                if (e.target.value)
                  setRange((r) => ({ ...r, from: e.target.value }));
              }}
            />
          </Field>
          <Field label="Até">
            <input
              type="date"
              value={range.to}
              onChange={(e) => {
                if (e.target.value)
                  setRange((r) => ({ ...r, to: e.target.value }));
              }}
            />
          </Field>
        </div>
        {state.data && (
          <Table headers={["Data", "Operação", "Motivo"]}>
            {state.data.exceptions.map((e) => (
              <tr key={e.date}>
                <td>{e.date}</td>
                <td>
                  {e.operates === null
                    ? "Programação semanal"
                    : e.operates
                      ? "Com transporte"
                      : "Sem transporte"}
                </td>
                <td>{e.reason}</td>
              </tr>
            ))}
          </Table>
        )}
      </section>
    </>
  );
}
