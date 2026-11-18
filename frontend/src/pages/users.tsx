import { useState } from "react";
import { all, api } from "../lib/api";
import type { Driver } from "../lib/types";
import {
  AsyncForm,
  Field,
  Heading,
  LoadState,
  Notice,
  useLoad,
  value,
} from "../components/common";
interface Created {
  id: string;
  email: string;
  role: string;
  temporaryPassword: string;
  temporaryExpiresAt: string;
}
export function Users() {
  const state = useLoad(() => all<Driver>("/drivers"));
  const [created, setCreated] = useState<Created>();
  return (
    <>
      <Heading
        title="Novo acesso"
        description="Crie uma conta individual. A senha temporária exige troca no primeiro acesso."
      />
      <Notice>
        A recuperação de contas existentes permanece disponível pelo
        procedimento administrativo do backend nesta primeira versão do painel.
      </Notice>
      <section className="panel narrow">
        <AsyncForm
          submit="Criar acesso"
          onSubmit={async (f) => {
            setCreated(undefined);
            setCreated(
              await api("/users", "POST", {
                email: value(f, "email"),
                role: value(f, "role"),
              }),
            );
          }}
        >
          <Field label="E-mail do usuário">
            <input name="email" type="email" autoComplete="off" required />
          </Field>
          <Field label="Perfil">
            <select name="role">
              <option value="operator">Operador</option>
              <option value="driver">Motorista</option>
              <option value="admin">Administrador</option>
            </select>
          </Field>
        </AsyncForm>
      </section>
      {created && (
        <section className="panel narrow">
          <h2>Acesso criado para {created.email}</h2>
          <p>
            Entregue a senha diretamente à pessoa. Ela desaparece ao sair desta
            tela.
          </p>
          <Field label="Senha temporária">
            <input
              readOnly
              value={created.temporaryPassword}
              autoComplete="off"
              onFocus={(e) => e.target.select()}
            />
          </Field>
          <p className="muted">
            Válida até{" "}
            {new Date(created.temporaryExpiresAt).toLocaleString("pt-BR", {
              timeZone: "America/Sao_Paulo",
            })}
            .
          </p>
          {created.role === "driver" && (
            <>
              <LoadState {...state} />
              <AsyncForm
                submit="Vincular motorista"
                disabled={!state.data}
                onSubmit={async (f) => {
                  await api(`/access/driver-links/${created.id}`, "PUT", {
                    driverId: value(f, "driver"),
                    expectedVersion: 0,
                  });
                }}
              >
                <Field label="Cadastro do motorista">
                  <select name="driver" required defaultValue="">
                    <option value="">Selecione</option>
                    {state.data
                      ?.filter((d) => d.active)
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                  </select>
                </Field>
              </AsyncForm>
            </>
          )}
        </section>
      )}
    </>
  );
}
