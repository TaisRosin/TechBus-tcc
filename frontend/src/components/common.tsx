import {
  useEffect,
  useRef,
  useState,
  useId,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
  type FormEvent,
} from "react";
import { RefreshCw, X, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "./ui/button";
import { label } from "../lib/api";

export function useLoad<T>(load: () => Promise<T>, key: string | number = "") {
  const [data, setData] = useState<T>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const loader = useRef(load);
  loader.current = load;
  useEffect(() => {
    let active = true;
    setData(undefined);
    setLoading(true);
    setError("");
    loader
      .current()
      .then((v) => {
        if (active) setData(v);
      })
      .catch((e) => {
        if (active) setError(e.message ?? "Não foi possível carregar.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [key, revision]);
  return { data, error, loading, reload: () => setRevision((n) => n + 1) };
}
export function Notice({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <div
      role={error ? "alert" : "status"}
      className={`notice ${error ? "error" : ""}`}
    >
      <AlertCircle size={18} />
      <span>{children}</span>
    </div>
  );
}
export function LoadState({
  loading,
  error,
  empty = false,
}: {
  loading: boolean;
  error: string;
  empty?: boolean;
}) {
  return loading ? (
    <div className="empty" role="status">
      Carregando dados…
    </div>
  ) : error ? (
    <Notice error>{error}</Notice>
  ) : empty ? (
    <div className="empty">Nenhum registro encontrado.</div>
  ) : null;
}
export function Heading({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <header className="page-heading">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="actions">{children}</div>
    </header>
  );
}
export function Refresh({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button variant="outline" onClick={onClick} disabled={disabled}>
      <RefreshCw size={16} />
      Atualizar
    </Button>
  );
}
export function Badge({ value }: { value: string }) {
  return (
    <span
      className={`badge ${["confirmado", "confirmed", "sent"].includes(value) ? "positive" : ["indeciso", "needs_adjustment", "unknown", "failed"].includes(value) ? "attention" : ""}`}
    >
      {label(value)}
    </span>
  );
}
export function Field({
  label: caption,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{caption}</label>
      {isValidElement(children)
        ? cloneElement(
            children as ReactElement<{
              id?: string;
              "aria-describedby"?: string;
            }>,
            { id, "aria-describedby": hint ? `${id}-hint` : undefined },
          )
        : children}
      {hint && <small id={`${id}-hint`}>{hint}</small>}
    </div>
  );
}
export function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current!;
    d.showModal();
    return () => d.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="dialog-head">
        <h2>{title}</h2>
        <Button variant="ghost" onClick={onClose} aria-label="Fechar">
          <X size={20} />
        </Button>
      </div>
      {children}
    </dialog>
  );
}
export function AsyncForm({
  onSubmit,
  children,
  submit = "Salvar",
  success = "Dados salvos.",
  disabled = false,
}: {
  onSubmit: (form: FormData) => Promise<void>;
  children: ReactNode;
  submit?: string;
  success?: string;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const lock = useRef(false);
  async function send(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setDone(false);
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      await onSubmit(form);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  return (
    <form onSubmit={send} onChange={() => setDone(false)}>
      <fieldset disabled={busy || disabled}>{children}</fieldset>
      {error && <Notice error>{error}</Notice>}
      {done && (
        <div role="status" className="success">
          <CheckCircle2 size={18} />
          {success}
        </div>
      )}
      <div className="form-footer">
        <Button type="submit" disabled={busy || disabled}>
          {busy ? "Salvando…" : submit}
        </Button>
      </div>
    </form>
  );
}
export const value = (f: FormData, k: string) => String(f.get(k) ?? "");
export const days = (f: FormData) => f.getAll("days").map(Number);
export const weekNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export function Days({ selected = [] }: { selected?: number[] }) {
  return (
    <fieldset className="days">
      <legend>Dias da semana</legend>
      {weekNames.map((name, i) => (
        <label key={i}>
          <input
            type="checkbox"
            name="days"
            value={i}
            defaultChecked={selected.includes(i)}
          />
          <span>{name}</span>
        </label>
      ))}
    </fieldset>
  );
}
export function Table({
  headers,
  children,
}: {
  headers: string[];
  children: ReactNode;
}) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
