import { api, all, label, timeLabel } from "../lib/api";
import {
  AsyncForm,
  Badge,
  Heading,
  LoadState,
  Notice,
  Refresh,
  Table,
  useLoad,
} from "../components/common";
interface Event {
  id: string;
  receivedAt: string;
  phone: string | null;
  text: string | null;
  conflict: boolean;
  interpretation: { code: string } | null;
  processing: { state: string; code: string } | null;
  clarification?: { state: string; code: string; text: string } | null;
  acknowledgement: {
    state: string;
    text: string;
    deliveryCode: string | null;
  } | null;
}
interface Outgoing {
  id: string;
  phone: string;
  text: string;
  status: string;
  code: string | null;
  version: number;
  slot: number;
}
export function Messages() {
  const state = useLoad(async () => {
    const [events, messages] = await Promise.all([
      all<Event>("/integrations/whatsapp/events"),
      all<Outgoing>("/messages"),
    ]);
    return { events, messages };
  });
  return (
    <>
      <Heading
        title="Mensagens"
        description="Recebimentos, interpretação e respostas da operação atual."
      >
        <Refresh onClick={state.reload} />
      </Heading>
      <Notice>
        Aceite do provedor não comprova entrega ou leitura. Envio incerto não
        permite repetição automática.
      </Notice>
      <LoadState {...state} />
      {state.data && (
        <>
          <section className="panel">
            <h2>Recebidas hoje</h2>
            {!state.data.events.length ? (
              <p className="empty">Nenhum evento recebido hoje.</p>
            ) : (
              <Table
                headers={[
                  "Horário / contato",
                  "Mensagem",
                  "Resultado",
                  "Recibo",
                ]}
              >
                {state.data.events.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <strong>{timeLabel(e.receivedAt)}</strong>
                      <small>{e.phone ?? "Contato não identificado"}</small>
                    </td>
                    <td className="message-text">
                      {e.text ?? "Evento sem texto"}
                    </td>
                    <td>
                      {e.conflict ? (
                        <Badge value="Conflito" />
                      ) : (
                        label(
                          e.processing?.code ??
                            e.interpretation?.code ??
                            "Aguardando processamento",
                        )
                      )}
                    </td>
                    <td>
                      {e.clarification && (
                        <details>
                          <summary>
                            Esclarecimento: {label(e.clarification.state)}
                          </summary>
                          <p className="message-text">{e.clarification.text}</p>
                          <small>{label(e.clarification.code)}</small>
                        </details>
                      )}
                      {e.acknowledgement ? (
                        <>
                          <Badge value={e.acknowledgement.state} />
                          <details>
                            <summary>Ver resposta</summary>
                            <p className="message-text">
                              {e.acknowledgement.text}
                            </p>
                          </details>
                        </>
                      ) : (
                        <span className="muted">Sem recibo preparado</span>
                      )}
                    </td>
                  </tr>
                ))}
              </Table>
            )}
          </section>
          <section className="panel">
            <h2>Consultas e lembretes</h2>
            {!state.data.messages.length ? (
              <p className="empty">
                Nenhuma consulta ou lembrete preparado hoje.
              </p>
            ) : (
              <Table
                headers={["Horário / contato", "Texto", "Situação", "Ação"]}
              >
                {state.data.messages.map((m) => (
                  <tr key={m.id}>
                    <td>
                      {m.slot}h<small>{m.phone}</small>
                    </td>
                    <td className="message-text">{m.text}</td>
                    <td>
                      <Badge value={m.status} />
                      {m.code && <small>{label(m.code)}</small>}
                    </td>
                    <td>
                      {m.status === "failed" ? (
                        <AsyncForm
                          submit="Tentar reenviar"
                          onSubmit={async () => {
                            await api(`/messages/${m.id}/retry`, "POST", {
                              expectedVersion: m.version,
                            });
                            state.reload();
                          }}
                        >
                          <label className="check">
                            <input type="checkbox" required />
                            Enviar esta mensagem novamente
                          </label>
                        </AsyncForm>
                      ) : (
                        <span className="muted">Sem reenvio disponível</span>
                      )}
                    </td>
                  </tr>
                ))}
              </Table>
            )}
          </section>
        </>
      )}
    </>
  );
}
