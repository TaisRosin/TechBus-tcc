import { useRef, useState } from "react";
import { Search, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { api, all, dateLabel, label } from "../lib/api";
import type { Catalog, OperationRow, Overview } from "../lib/types";
import {
  AsyncForm,
  Badge,
  Dialog,
  Field,
  Heading,
  LoadState,
  Notice,
  Refresh,
  Table,
  useLoad,
  value,
} from "../components/common";
import { Button } from "../components/ui/button";
async function loadOverview() {
  let offset = 0;
  const first = await api<Overview>("/operations/overview?limit=100&offset=0");
  const rows = [...first.students];
  while (rows.length < first.total) {
    offset += 100;
    const next = await api<Overview>(
      `/operations/overview?limit=100&offset=${offset}`,
    );
    if (next.date !== first.date)
      throw new Error("A operação mudou de dia. Atualize a tela.");
    if (!next.students.length) break;
    rows.push(...next.students);
  }
  return { ...first, students: rows };
}
export function Operation() {
  const state = useLoad(loadOverview);
  const [query, setQuery] = useState("");
  const [university, setUniversity] = useState("");
  const [pending, setPending] = useState(false);
  const [selected, setSelected] = useState<OperationRow>();
  const rows = (state.data?.students ?? []).filter(
    (r) =>
      (!university || r.universityId === university) &&
      (!pending || r.issues.length || r.pending.length) &&
      r.name.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <Heading
        title="Operação do dia"
        description={
          state.data
            ? `${dateLabel(state.data.date)} · Transporte noturno`
            : "Confirmações, locais e pendências da operação atual."
        }
      >
        <Refresh onClick={state.reload} disabled={state.loading} />
      </Heading>
      {state.data && (
        <div className="operation-summary">
          <div>
            <ArrowUpRight size={22} />
            <strong>{state.data.counts.pickup.confirmado ?? 0}</strong>
            <span>confirmados na ida</span>
          </div>
          <div>
            <ArrowDownLeft size={22} />
            <strong>{state.data.counts.dropoff.confirmado ?? 0}</strong>
            <span>confirmados na volta</span>
          </div>
          <div className="summary-note">
            <strong>
              {
                state.data.students.filter(
                  (r) => r.issues.length || r.pending.length,
                ).length
              }
            </strong>
            <span>alunos com pendências</span>
          </div>
        </div>
      )}
      <div className="toolbar">
        <label className="search">
          <Search size={18} />
          <input
            aria-label="Buscar na operação"
            placeholder="Buscar aluno"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select
          aria-label="Filtrar universidade"
          value={university}
          onChange={(e) => setUniversity(e.target.value)}
        >
          <option value="">Todas as universidades</option>
          <option value="unimater">Unimater</option>
          <option value="unidep">Unidep</option>
        </select>
        <label className="check">
          <input
            type="checkbox"
            checked={pending}
            onChange={(e) => setPending(e.target.checked)}
          />
          Só pendências
        </label>
      </div>
      <LoadState {...state} empty={!!state.data && !rows.length} />
      {rows.length > 0 && (
        <Table
          headers={[
            "Aluno",
            "Ida",
            "Volta",
            "Locais registrados",
            "Acompanhamento",
            "Ação",
          ]}
        >
          {rows.map((row) => (
            <tr key={row.studentId}>
              <td>
                <strong>{row.name}</strong>
                <small>{label(row.universityId)}</small>
              </td>
              <td>
                <Badge value={row.pickup.state} />
                <small>{label(row.pickup.origin)}</small>
              </td>
              <td>
                <Badge value={row.dropoff.state} />
                <small>{label(row.dropoff.origin)}</small>
              </td>
              <td>
                <span>Ida: {row.pickupPlace?.label ?? "Pendente"}</span>
                <small>Volta: {row.dropoffPlace?.label ?? "Pendente"}</small>
              </td>
              <td>
                {row.issues.length ? (
                  <ul className="issue-list">
                    {row.issues.map((code) => (
                      <li key={code}>{label(code)}</li>
                    ))}
                  </ul>
                ) : (
                  <span className="muted">Sem pendências apontadas</span>
                )}
              </td>
              <td>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label={`Revisar ${row.name}`}
                  onClick={() => setSelected(row)}
                >
                  Revisar
                </Button>
              </td>
            </tr>
          ))}
        </Table>
      )}
      <p className="footnote">
        Confirmação representa intenção de uso, não presença. Atualize a lista
        para consultar novas respostas.
      </p>
      {selected && (
        <Dialog
          title={`Revisar ${selected.name}`}
          onClose={() => setSelected(undefined)}
        >
          <Correction
            row={selected}
            onSaved={() => {
              setSelected(undefined);
              state.reload();
            }}
          />
        </Dialog>
      )}
    </>
  );
}
interface Receipt {
  id: string;
  receivedAt?: string;
  received_at?: string;
  command?: unknown;
  code?: string;
  status?: string;
}
function Correction({
  row,
  onSaved,
}: {
  row: OperationRow;
  onSaved: () => void;
}) {
  const state = useLoad(async () => {
    const [review, points, dropoffPoints] = await Promise.all([
      api<{ version: number; pendingReceipts: Receipt[] }>(
        `/students/${row.studentId}/journey/correction`,
      ),
      all<Catalog>("/boarding-points"),
      all<Catalog>("/dropoff-points"),
    ]);
    return { ...review, points, dropoffPoints };
  }, row.studentId);
  const operation = useRef<{ fingerprint: string; id: string } | undefined>(
    undefined,
  );
  return (
    <>
      <Notice>
        A correção altera somente os trechos selecionados e não envia WhatsApp
        automaticamente.
      </Notice>
      <LoadState {...state} />
      {state.error && <Refresh onClick={state.reload} />}{" "}
      {state.data && (
        <AsyncForm
          submit="Salvar correção"
          success="Correção registrada."
          onSubmit={async (f) => {
            const changes: Record<string, string> = {};
            for (const key of ["pickup", "dropoff", "pointId", "locationId"])
              if (value(f, key)) changes[key] = value(f, key);
            const reviewedReceiptIds = f.getAll("reviewed").map(String);
            if (
              reviewedReceiptIds.length !== state.data!.pendingReceipts.length
            )
              throw new Error(
                "Revise explicitamente todas as mensagens pendentes antes de salvar.",
              );
            if (!Object.keys(changes).length && !reviewedReceiptIds.length)
              throw new Error("Selecione uma alteração.");
            const payload = {
              expectedVersion: state.data!.version,
              reason: value(f, "reason"),
              reviewedReceiptIds,
              changes,
            };
            const fingerprint = JSON.stringify(payload);
            if (operation.current?.fingerprint !== fingerprint)
              operation.current = { fingerprint, id: crypto.randomUUID() };
            await api(`/students/${row.studentId}/journey/correction`, "POST", {
              ...payload,
              operationId: operation.current!.id,
            });
            onSaved();
          }}
        >
          <div className="form-grid">
            {(["pickup", "dropoff"] as const).map((side) => (
              <Field key={side} label={side === "pickup" ? "Ida" : "Volta"}>
                <select name={side} defaultValue="">
                  <option value="">Manter estado atual</option>
                  <option value="confirmado">Confirmar</option>
                  <option value="recusado">Não vai</option>
                </select>
              </Field>
            ))}
          </div>
          <Field label="Ponto de embarque">
            <select name="pointId">
              <option value="">Manter local atual</option>
              {state.data.points
                .filter((p) => p.active)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Ponto de desembarque">
            <select name="locationId">
              <option value="">Manter local atual</option>
              {state.data.dropoffPoints
                .filter((p) => p.active)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </Field>
          {state.data.pendingReceipts.length > 0 && (
            <section className="inset">
              <h3>Mensagens pendentes</h3>
              <p>
                Consulte o conteúdo em Mensagens antes de encerrar a pendência.
              </p>
              {state.data.pendingReceipts.map((r, i) => (
                <label className="check" key={r.id}>
                  <input type="checkbox" name="reviewed" value={r.id} />
                  Revisei a pendência {i + 1}
                  {r.code ? `: ${label(r.code)}` : ""}
                </label>
              ))}
            </section>
          )}
          <Field label="Justificativa">
            <textarea name="reason" required maxLength={1000} />
          </Field>
        </AsyncForm>
      )}
    </>
  );
}
