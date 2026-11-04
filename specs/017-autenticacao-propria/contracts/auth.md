# Contrato proposto — B18.1

Rotas em `/api/v1`, JSON estrito, sem campos desconhecidos; senhas/tokens nunca em URL, logs ou respostas de consulta. Respostas de autenticação `Cache-Control: no-store`. Bearer estrito existente preservado. HTTPS obrigatório antes de exposição externa; testes somente loopback.

| Operação | Entrada | Resultado e acesso |
| --- | --- | --- |
| POST `/auth/login` | `{email,password}` | Pública somente para autenticar; 200 `{token,scope,expiresAt}` com escopo operation ou password-change. Credencial inválida/inativa/vencida 401 genérico; limite 429; falha interna 503 |
| POST `/auth/password` | Bearer restrito + `{newPassword}` | 204, consome temporária/contexto atomicamente, revoga sessões, exige novo login. Não cria acesso operacional automaticamente |
| POST `/auth/logout` | Bearer de qualquer escopo | 204, revoga sessão identificada; repetição de token já revogado também 204, sem renovar sessão |
| GET `/session` | Bearer operacional | Mantém contrato B03 `{id,role,active,version}`. Token restrito recusado |
| POST `/users` | `{email,role}` | Admin ativo; conta ativa inicial; 201 `{id,email,role,temporaryPassword,temporaryExpiresAt,credentialVersion}`. Temporária mostrada somente nessa resposta para entrega manual |
| POST `/users/:id/credentials` | `{email}` | Admin ativo; provisiona somente conta legada sem credencial, sem alterar active/role/subject. 201 com temporária, validade e revisão; 409 se já provisionada |
| POST `/users/:id/password-reset` | `{expectedCredentialVersion}` | Admin ativo; 200 com nova temporária, validade e revisão. Não muda situação/perfil; alvo inativo permanece bloqueado |
| GET `/users/:id/credentials` | nenhum | Admin ativo; metadados `{email,mustChange,temporaryExpiresAt,credentialVersion}` ou indicação sem credencial. Nunca hash/senha/token |
| PATCH `/users/:id/access` | contrato B03 existente | Preserva revisão/perfis/último admin; desativação revoga sessões na mesma transação, reativação não restaura sessões antigas |

IDs UUID; role enum fixo; email conforme modelo, senha conforme pesquisa; expectedCredentialVersion inteiro positivo, revisão antiga 409. Criação/provisionamento repetidos não reexibem temporária antiga; resposta perdida exige reset explícito, não reenvio cego. O endpoint histórico `/users/invitations` passa a 410 `INVITATIONS_REPLACED` somente para admin, sem simular convite.

Erros seguros `{code}`: 400 INVALID_INPUT, 401 UNAUTHENTICATED, 403 FORBIDDEN, 404 NOT_FOUND, 409 EMAIL_EXISTS/CREDENTIALS_EXIST/VERSION_CONFLICT/LAST_ADMIN, 429 AUTH_RATE_LIMITED, 503 AUTH_UNAVAILABLE. Login externo não diferencia conta inexistente, inativa ou senha incorreta. Status operacional e autorização continuam verificados no backend.

## Cliente futuro (B19)

Guardar token somente em memória do documento. Nunca persistir em storage/cookie/cache, URL ou mensagens de erro. Início/recarga/restauração por pageshow limpa token e dados e exige login; navegação interna pode continuar. Nenhum refresh automático. Polls não renovam last_activity; serviço documentará quais consultas são polling para o painel. Critério observável exige teste de reload, fechar/reabrir e restauração nos navegadores escolhidos em B19.

## Comandos técnicos propostos

`auth:bootstrap`: execução local com credenciais administrativas de manutenção, input interativo de email, gera temporária exibida uma única vez, recusa equipe existente. `auth:recover-admin`: ID explícito do único admin ativo; pede email somente se ainda não provisionado; gera temporária, revoga sessões e registra evento. Sem senha em argumentos/histórico, sem endpoint público; app normal não ganha permissão DDL. Detalhar instruções executáveis no quickstart ao implementar.
