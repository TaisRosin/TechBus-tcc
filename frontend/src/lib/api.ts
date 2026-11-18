let token: string | null = null;
let generation = 0;
let unauthorized = () => {};
export function configureSession(value: string | null, onExpired?: () => void) {
  token = value;
  generation++;
  if (onExpired) unauthorized = onExpired;
}
export class ApiError extends Error {
  constructor(
    public code: string,
    public status: number,
  ) {
    super(errorText(code));
  }
}
const errors: Record<string, string> = {
  MAPS_POINT_UNAVAILABLE:
    "Há um local da viagem fora do catálogo de pontos fixos. Revise os locais dos passageiros antes de traçar o percurso.",
  MAPS_UNCONFIGURED: "Chave do Google Maps não configurada no servidor.",
  MAPS_UNAVAILABLE:
    "Google Maps indisponível. Verifique a conexão ou a configuração das APIs.",
  MAPS_ROUTE_NOT_FOUND:
    "O Google não encontrou um percurso entre esses locais.",
  FIXED_DROPOFF_REQUIRED:
    "Selecione um ponto de desembarque cadastrado pela empresa.",
  UNAUTHENTICATED:
    "E-mail ou senha incorretos, ou sessão expirada. Entre novamente.",
  FORBIDDEN: "Seu perfil não tem acesso a esta ação.",
  AUTH_RATE_LIMITED: "Muitas tentativas. Aguarde antes de tentar novamente.",
  AUTH_UNAVAILABLE:
    "Não foi possível acessar o serviço de login. Verifique se o servidor e o banco de dados estão disponíveis.",
  SERVER_ERROR:
    "O servidor não conseguiu concluir a operação. Tente novamente; se persistir, verifique o servidor local.",
  VERSION_CONFLICT:
    "Os dados foram alterados. Atualize a tela antes de salvar novamente.",
  DEMAND_CHANGED: "A demanda mudou. Atualize e revise o planejamento.",
  PREVIEW_CHANGED: "O itinerário mudou. Atualize antes de publicar.",
  INVALID_INPUT: "Confira os campos informados.",
  CONTRACT_OVERLAP: "Essa vigência se sobrepõe a outra já cadastrada.",
  PHONE_CONFLICT: "Este telefone já está cadastrado.",
  ADDRESS_VALIDATION_UNAVAILABLE:
    "A validação de endereços ainda está indisponível. O endereço anterior foi preservado.",
  OUTSIDE_SERVICE_AREA: "Endereço fora da área atendida.",
  GROUP_UNRESOLVED: "Não foi possível identificar a região do endereço.",
  CLOSURE_NOT_DUE:
    "O planejamento só pode ser confirmado após o fechamento das 17h.",
  PLANNING_REQUIRES_ADJUSTMENT:
    "Resolva as pendências e conclua o fechamento antes de confirmar.",
  ITINERARY_INCOMPLETE:
    "Inclua todos os locais confirmados na ordem antes de publicar.",
  WHATSAPP_UNAVAILABLE: "Não foi possível consultar o WhatsApp agora.",
  DATABASE_UNAVAILABLE:
    "Banco de dados indisponível. Verifique o servidor local.",
  NETWORK_ERROR:
    "Não foi possível acessar o servidor. Verifique se o backend está iniciado.",
  NOT_CONFIGURED: "Não configurado",
  COMMAND_PENDING: "Mensagem pendente de revisão",
  PICKUP_LOCATION_INVALID: "Ponto de embarque pendente",
  DROPOFF_LOCATION_INVALID: "Endereço de volta pendente",
  NO_VALID_CONTRACT: "Sem vigência válida",
  NO_OPERATION: "Universidade sem operação nesta data",
  CALENDAR_UNCONFIGURED: "Calendário não configurado",
  CONTEXT_CHANGED: "Cadastro ou contexto alterado",
  AMBIGUOUS: "Resposta ambígua",
  LOCATION_RESOLUTION_REQUIRED: "Local precisa ser resolvido",
  ORDER_UNCERTAIN: "Ordem da mensagem incerta",
  APPLIED: "Aplicado",
  PROCESSING_FAILED: "Falha no processamento",
  PROVIDER_UNAVAILABLE: "Interpretação indisponível",
  UNKNOWN_CONTACT: "Contato não cadastrado",
  DELIVERY_UNCERTAIN: "Resultado do envio incerto",
  PROVIDER_ACCEPTED: "Aceito pelo provedor",
};
export const errorText = (code: string) =>
  errors[code] ?? `A operação não pôde ser concluída (${code}).`;
export const label = (value: string) =>
  (
    ({
      pickup: "Ida",
      dropoff: "Volta",
      collection: "Coleta",
      distribution: "Distribuição",
      intermunicipal: "Intermunicipal",
      unimater: "Unimater",
      unidep: "Unidep",
      confirmado: "Confirmado",
      sem_resposta: "Sem resposta",
      indeciso: "Indeciso",
      recusado: "Não vai",
      cancelado: "Cancelado",
      draft: "Rascunho",
      confirmed: "Confirmado",
      needs_adjustment: "Revisão necessária",
      sent: "Aceito pelo provedor",
      ready: "Preparado",
      unknown: "Envio incerto",
      sending: "Em envio",
      failed: "Falha",
      skipped: "Não pertinente",
      prepared: "Preparado",
      superseded: "Superado",
      completed: "Processado",
      answered: "Respondido",
      escalated: "Revisão da equipe",
      TEAM_REVIEW_REQUIRED: "Dúvida persistente; revisar com a equipe",
      CONTEXT_REVIEW_REQUIRED:
        "Resposta sem contexto válido; revisar com a equipe",
      CLARIFICATION_PREPARED: "Pergunta preparada",
      ANSWER_APPLIED: "Resposta aplicada à viagem",
      processing: "Em processamento",
      admin: "Administrador",
      operator: "Operador",
      driver: "Motorista",
      aluno: "Aluno",
      equipe: "Equipe",
      padrao: "Padrão",
      closure: "Fechamento",
      VEHICLE_STAGE_CONFLICT: "Veículo já atribuído nesta etapa",
      DRIVER_STAGE_CONFLICT: "Motorista já atribuído neste trecho da etapa",
      AVAILABILITY_NOT_CONFIGURED: "Disponibilidade por dia não configurada",
      VEHICLE_UNAVAILABLE: "Veículo indisponível neste dia",
      CAPACITY_INSUFFICIENT: "Capacidade insuficiente",
      DEMAND_UNCOVERED: "Há passageiros sem veículo atribuído",
      DUPLICATE_ALLOCATION: "Há atribuição duplicada no grupo ou universidade",
      van: "Van",
      micro: "Micro-ônibus",
      bus: "Ônibus",
    }) as Record<string, string>
  )[value] ??
  errors[value] ??
  value;
export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const requestGeneration = generation;
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new ApiError("NETWORK_ERROR", 0);
  }
  if (requestGeneration !== generation)
    throw new ApiError("SESSION_CHANGED", 401);
  if (!response.ok) {
    const result = await response
      .json()
      .catch(() => ({ code: "SERVER_ERROR" }));
    if (response.status === 401 && token) {
      configureSession(null);
      unauthorized();
    }
    throw new ApiError(
      typeof result.code === "string" ? result.code : "SERVER_ERROR",
      response.status,
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
export async function all<T>(path: string): Promise<T[]> {
  const out: T[] = [];
  for (let offset = 0; ; offset += 100) {
    const batch = await api<T[]>(
      `${path}${path.includes("?") ? "&" : "?"}limit=100&offset=${offset}`,
    );
    if (!Array.isArray(batch))
      throw new Error("Resposta inesperada do servidor.");
    out.push(...batch);
    if (batch.length < 100) return out;
  }
}
export const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export const dateLabel = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "long",
  });
export const timeLabel = (date: string) =>
  new Date(date).toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  });
export function minutes(time: string, next = false) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m + (next ? 1440 : 0);
}
export function clockLabel(n: number) {
  return `${String(Math.floor(n / 60) % 24).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}${n >= 1440 ? " (+1 dia)" : ""}`;
}
