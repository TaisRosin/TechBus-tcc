# Dados propostos — B18.1

Desenho para futura migração aditiva; nenhum SQL executado. Todas as tabelas em `app`, application sem DDL, sem exclusão em cascata da equipe. IDs/vínculos existentes preservados.

| Entidade | Campos e restrições |
| --- | --- |
| `auth_credentials` | `user_id uuid` PK/FK team_users; `email text` obrigatório normalizado trim/lowercase, 3–254 caracteres e UNIQUE; `password_hash text` obrigatório; `must_change boolean` obrigatório; `temporary_expires_at timestamptz` obrigatório apenas quando must_change; `version integer > 0`; `updated_at timestamptz` obrigatório |
| `auth_sessions` | `id uuid` PK; `user_id uuid` FK obrigatório/indexado; `token_hash text` UNIQUE obrigatório; `scope text` enum operation/password-change; `credential_version integer > 0`; `created_at`, `last_activity_at`, `expires_at timestamptz` obrigatórios; `revoked_at timestamptz` opcional. Check last_activity_at >= created_at e expires_at > created_at |
| `auth_events` | `id uuid` PK; `actor_id uuid` FK opcional somente para bootstrap/técnico; `target_id uuid` FK obrigatório; `kind text` enum bootstrap/create/provision/change/reset/logout/technical-reset; `occurred_at timestamptz` obrigatório. Sem senha/token/e-mail integral no evento; ator técnico identificado pelo tipo e execução local restrita |
| `auth_attempt_windows` | `key_hash text` e `window_start timestamptz` PK composta; `count integer >= 0`; `kind text` enum account/origin; chave derivada do identificador normalizado/origem, sem armazenar senha. Atualização atômica; usar janelas móveis de 15 minutos calculadas sobre buckets por minuto, rejeição conservadora no minuto de fronteira |

Email 3–254 é limite estrutural, validação de formato também ocorre no serviço; não transforma cadastro em verificação de caixa postal. Senha definitiva 15–128 caracteres, sem truncamento; temporária gerada pelo servidor. Não alterar email/role/active por mass assignment.

## Transições e transações

Sem credencial → provisionada temporária → troca obrigatória → definitiva. Reset de qualquer credencial → temporária nova com versão incrementada; invalida todas as sessões na mesma transação. Troca válida → definitiva, incrementa versão, revoga contextos antigos. Expiração não ativa conta, não troca perfil, não apaga registro.

Ordem de lock: advisory B03 `(82403,1)`, equipe por ID em ordem estável, credencial, sessões. Autoridade do ator deve ser relida na transação administrativa. Bootstrap usa o mesmo lock antes de verificar equipe vazia. Constraints UNIQUE garantem email/token únicos mesmo concorrentes. Sessão restrita não satisfaz `IdentityVerifier` operacional.

Inatividade usa último acesso autorizado, sem renovação por polling; limite absoluto é imutável. UPDATE condicional exige sessão ainda válida/não revogada e versão atual, com relógio do servidor. Falha de banco nega acesso; migração down deve recusar remoção quando houver dados de autenticação, sem apagamento silencioso. Nenhuma política automática de retenção introduzida.
