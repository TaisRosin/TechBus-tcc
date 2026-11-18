import { MapsPage } from "./pages/maps";
import { useEffect, useState } from "react";
import {
  BusFront,
  LayoutList,
  UsersRound,
  CalendarDays,
  MapPin,
  Route,
  MessageSquare,
  LogOut,
  UserPlus,
  ArrowRight,
} from "lucide-react";
import { api, configureSession, label } from "./lib/api";
import type { Session } from "./lib/types";
import { AsyncForm, Field, Notice, value } from "./components/common";
import { Button } from "./components/ui/button";
import { Students } from "./pages/students";
import { Operation } from "./pages/operation";
import { CalendarPage } from "./pages/calendar";
import { Catalogs } from "./pages/catalogs";
import { Messages } from "./pages/messages";
import { DailyItinerary as Itineraries } from "./pages/planning";
import { DriverPage } from "./pages/driver";
import { Users } from "./pages/users";

const nav = [
  ["operation", "Operação do dia", LayoutList],
  ["students", "Alunos", UsersRound],
  ["calendar", "Calendários", CalendarDays],
  ["places", "Grupos e locais", MapPin],
  ["fleet", "Frota e motoristas", BusFront],
  ["itinerary", "Itinerários", Route],
  ["maps", "Mapa e rotas", MapPin],
  ["messages", "Mensagens", MessageSquare],
] as const;
export default function App() {
  const [user, setUser] = useState<Session | null>(null);
  const [passwordChange, setPasswordChange] = useState(false);
  const [page, setPage] = useState("operation");
  const [message, setMessage] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  function clear(note = "") {
    configureSession(null);
    setUser(null);
    setPasswordChange(false);
    setPage("operation");
    setMessage(note);
  }
  useEffect(() => {
    configureSession(null, () =>
      clear("Sua sessão terminou. Entre novamente."),
    );
    const restore = (e: PageTransitionEvent) => {
      if (e.persisted) clear();
    };
    const hide = () => clear();
    window.addEventListener("pageshow", restore);
    window.addEventListener("pagehide", hide);
    return () => {
      window.removeEventListener("pageshow", restore);
      window.removeEventListener("pagehide", hide);
      configureSession(null);
    };
  }, []);
  if (!user)
    return (
      <main className="login-shell">
        <section className="login-story">
          <div className="brand">
            <BusFront size={30} />
            <span>TechBus</span>
          </div>
          <div>
            <p className="login-kicker">Transporte universitário noturno</p>
            <h1>
              Cada viagem começa
              <br />
              com uma operação organizada.
            </h1>
            <p>
              Alunos, veículos e trajetos.
              <br />A informação certa para acompanhar a noite.
            </p>
          </div>
          <div className="journey-line">
            <span>São Lourenço</span>
            <ArrowRight size={18} />
            <span>Fiscalização</span>
            <ArrowRight size={18} />
            <span>Pato Branco</span>
          </div>
        </section>
        <section className="login-form">
          <div className="mobile-brand">
            <BusFront size={25} /> TechBus
          </div>
          <h2>{passwordChange ? "Defina sua senha" : "Acessar o painel"}</h2>
          <p className="muted">
            {passwordChange
              ? "Escolha uma senha pessoal com pelo menos 15 caracteres."
              : "Entre com o acesso fornecido pelo administrador."}
          </p>
          {message && <Notice>{message}</Notice>}
          {passwordChange ? (
            <AsyncForm
              key="password-change"
              submit="Salvar nova senha"
              onSubmit={async (f) => {
                const password = value(f, "newPassword");
                if (password !== value(f, "repeat"))
                  throw new Error("As senhas não coincidem.");
                await api("/auth/password", "POST", { newPassword: password });
                clear("Senha definida. Entre com sua nova senha.");
              }}
            >
              <Field label="Nova senha">
                <input
                  type="password"
                  name="newPassword"
                  minLength={15}
                  maxLength={128}
                  autoComplete="new-password"
                  required
                />
              </Field>
              <Field label="Repita a nova senha">
                <input
                  type="password"
                  name="repeat"
                  minLength={15}
                  maxLength={128}
                  autoComplete="new-password"
                  required
                />
              </Field>
            </AsyncForm>
          ) : (
            <AsyncForm
              key="login"
              submit="Entrar"
              onSubmit={async (f) => {
                setMessage("");
                configureSession(null);
                try {
                  const login = await api<{ token: string; scope: string }>(
                    "/auth/login",
                    "POST",
                    {
                      email: value(f, "email"),
                      password: value(f, "password"),
                    },
                  );
                  configureSession(login.token);
                  if (login.scope === "password-change") {
                    setPasswordChange(true);
                    return;
                  }
                  if (login.scope !== "operation")
                    throw new Error(
                      "Acesso indisponível. Consulte o administrador.",
                    );
                  const session = await api<Session>("/session");
                  if (
                    !session.active ||
                    !["admin", "operator", "driver"].includes(session.role)
                  )
                    throw new Error("Perfil de acesso inválido.");
                  setUser(session);
                } catch (e) {
                  configureSession(null);
                  throw e;
                }
              }}
            >
              <Field label="E-mail">
                <input
                  type="email"
                  name="email"
                  autoComplete="username"
                  autoFocus
                  required
                />
              </Field>
              <Field label="Senha">
                <input
                  type="password"
                  name="password"
                  maxLength={128}
                  autoComplete="current-password"
                  required
                />
              </Field>
            </AsyncForm>
          )}
          <p className="login-help">
            Esqueceu sua senha? Solicite a recuperação ao administrador.
          </p>
          <small className="muted">
            Por segurança, recarregar ou reabrir o painel exige novo login.
          </small>
        </section>
      </main>
    );
  const screens: Record<string, React.ReactNode> = {
    operation: <Operation />,
    students: <Students />,
    calendar: <CalendarPage />,
    places: <Catalogs key="places" />,
    fleet: <Catalogs key="fleet" fleet />,
    itinerary: <Itineraries />,
    maps: <MapsPage />,
    messages: <Messages />,
    users: <Users />,
  };
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Ir para o conteúdo
      </a>
      <aside className="sidebar">
        <div className="brand">
          <BusFront size={28} />
          <span>TechBus</span>
        </div>
        <p className="workspace-label">Transporte universitário</p>
        <nav aria-label="Navegação principal">
          {user.role === "driver" ? (
            <Button variant="ghost" className="nav-item active">
              <Route size={19} />
              Minhas viagens
            </Button>
          ) : (
            <>
              {nav.map(([key, text, Icon]) => (
                <Button
                  variant="ghost"
                  className={`nav-item ${page === key ? "active" : ""}`}
                  key={key}
                  onClick={() => setPage(key)}
                  aria-current={page === key ? "page" : undefined}
                >
                  <Icon size={19} />
                  {text}
                </Button>
              ))}
              {user.role === "admin" && (
                <Button
                  variant="ghost"
                  className={`nav-item ${page === "users" ? "active" : ""}`}
                  onClick={() => setPage("users")}
                >
                  <UserPlus size={19} />
                  Novo acesso
                </Button>
              )}
            </>
          )}
        </nav>
        <div className="sidebar-footer">
          <span className="avatar">
            {user.role === "driver" ? "M" : user.role === "admin" ? "A" : "O"}
          </span>
          <div>
            <strong>{label(user.role)}</strong>
            <small>Acesso individual</small>
          </div>
          <Button
            variant="ghost"
            aria-label="Sair"
            disabled={loggingOut}
            onClick={async () => {
              setLoggingOut(true);
              try {
                await api("/auth/logout", "POST");
              } catch {
                /* Local sign-out still clears the credential. */
              } finally {
                clear();
                setLoggingOut(false);
              }
            }}
          >
            <LogOut size={18} />
          </Button>
        </div>
      </aside>
      <div className="main-area">
        <div className="topbar">
          <span>
            São Lourenço do Oeste{" "}
            <span className="muted">/ Operação noturna</span>
          </span>
          <span className="local-tag">Ambiente local</span>
        </div>
        <main id="main" key={user.role === "driver" ? "driver" : page}>
          {user.role === "driver" ? (
            <DriverPage />
          ) : (
            (screens[page] ?? <Operation />)
          )}
        </main>
        <footer className="app-footer">
          TechBus · Unimater e Unidep<span>Horários de Brasília</span>
        </footer>
      </div>
    </div>
  );
}
