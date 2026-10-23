# Contratos — B03

- `IdentityVerifier.verify(token)` retorna somente subject de identidade validada ou erro seguro; nunca papel. Padrão: 503 AUTH_UNAVAILABLE. Token ausente/malformado: 401 UNAUTHENTICATED. Tokens inválidos/expirados são recusados pelo verificador. Implementação real B18.
- `AccessService.authorize(subject, action, resourceId?)`: consulta usuário atual. Sem vínculo ativo: 403 FORBIDDEN. session: três perfis; users:manage/settings:manage: admin; operations:manage: admin/operator; trips:read: admin/operator ou driver com atribuição positiva da porta. Recurso alheio/inexistente do driver: 404 NOT_FOUND.
- `AccessService.changeAccess(subject, id, command)`: admin atual, comando exato {role, active, expectedVersion}; role único enum, active boolean, expectedVersion inteiro positivo. ID UUID. Validação 400 INVALID_INPUT, alvo ausente 404, revisão antiga 409 VERSION_CONFLICT, último admin 409 LAST_ADMIN. Relê ator e alvo sob lock; retorno seguro {id, role, active, version}.
- GET `/api/v1/session`: identidade e vínculo corrente {id, role, active, version}, sem token.
- PATCH `/api/v1/users/:id/access`: corpo acima, sem campos extras; sempre autorização antes da alteração. expectedVersion é o controle de repetição deste comando (reenvio de versão consumida retorna 409, não novo efeito). Não promete ainda o contrato genérico de Idempotency-Key proposto em docs/api.md.
- POST `/api/v1/users/invitations`: somente admin; integração ainda indisponível retorna 503 INVITATIONS_UNAVAILABLE, nunca convite fictício enviado/criado.
- Erros B03: {code}; nenhuma senha, token ou detalhe SQL. Falhas de persistência/atribuições: 503 ACCESS_UNAVAILABLE. Rotas sem metadados de permissão: negadas.

Guard verifica Bearer estrito, resolve identidade e chama política. Políticas de configurações/operação/viagens são testadas por controllers exclusivos de testes; seus módulos reais ainda não existem. A porta de atribuição padrão não fornece viagens; não existe acesso por driverId do cliente. Health continua público e local conforme B02.
