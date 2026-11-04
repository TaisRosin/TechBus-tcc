# Verificação B18.1 — autenticação própria

Data: 28/10/2026, America/Sao_Paulo. Implementação autorizada por Taís após preparação Spec Kit; execução local, sem contas reais ou serviços externos.

## Resultado funcional

- Login por e-mail/senha com identidade real ligada ao subject existente; autorização B03 preservada e consultada em cada requisição.
- Criação/provisionamento administrativo, metadados sem segredos, temporária aleatória de 24h, contexto restrito de 10 minutos, troca obrigatória e novo login.
- Sessão opaca de 32 bytes; banco guarda digest, expiração por 1h inatividade/12h absoluta, polling passivo, logout/revogação e bloqueio de conta inativa. Desativar/reativar não restaura sessão anterior.
- Recuperação administrativa com revisão concorrente; bootstrap/recuperação do único admin em CLI interativa, com credencial local de manutenção e sem endpoint público.
- Migração OwnAuth1794000000000 aplicada em test e dev, sem alterar IDs/vínculos ou criar senhas padrão. Aplicação sem DDL/DELETE; reversão recusa dados de autenticação.

## Evidências

| Verificação | Resultado |
| --- | --- |
| Baseline unitário anterior | 136 testes / 18 suites aprovados |
| Unitários finais | 153 testes / 21 suites (execução completa de 152, mais novo teste de fila; ambos testes de hash reexecutados e aprovados) |
| Integração PostgreSQL completa | 181 testes / 31 suites aprovados |
| HTTP/e2e completo | 40 testes / 16 suites aprovados |
| Total distinto | 374 testes / 68 suites; 45 testes adicionados sobre B17 |
| Tipos, build e lint | ESLint, TypeScript --noEmit e Nest build aprovados na execução final (exit 0) |

TDD observado: tabela de autenticação ausente antes da migração; hasher ausente antes da implementação; login/fluxos administrativos sem métodos antes da implementação; HTTP 404 antes do controller; depois cenários verdes. Testes usam dados sintéticos e limpam seus usuários, credenciais, sessões e eventos. Relógio injetado cobre fronteiras exatas; gates na fronteira criptográfica verificam reset durante login e perda de autoridade durante geração da nova senha.

Regressão abrange regras B03–B17, incluindo último admin concorrente, vínculo motorista, jornadas, alocação e itinerários. Testes específicos cobrem duplicidade de e-mail, consumo único, temporária expirada/substituída, limitação persistida de tentativas, negação de usuário inativo, ausência de bypass por token fictício e não exposição de credenciais em consultas.

Comandos usados: ferramentas Node privadas via scripts/use-local-node.ps1; Jest nos projetos unit/integration/e2e; TypeScript --noEmit; Nest build; ESLint. Migração dev executada somente após confirmar que a única pendente era OwnAuth1794000000000. Durante desenvolvimento, o identificador inicial da nova migração coincidiu com uma migração histórica; foi corrigido para timestamp único e alinhado somente seu registro no banco de testes, sem editar migração histórica ou recriar dados. Erros de tipagem corrigidos antes da entrega.

A alteração de sandbox durante a execução bloqueou temporariamente loopback (EACCES), não uma falha funcional. Migração dev e suíte HTTP foram reexecutadas com liberação da revisão automática; resultados finais acima são das execuções bem-sucedidas.

## Custo criptográfico observado

Scrypt N=131072/r=8/p=1, duas derivações simultâneas e fila máxima 8. Ensaio sintético no código compilado: hash+verificação em 1476, 1450 e 2176 ms; pico RSS do processo observado 175 MiB no ensaio sequencial. Não é SLA nem medição de pico com duas derivações. Teste adicional confirma 10 requisições admitidas (2 ativas + 8 aguardando), 11ª recusada e serviço continua funcionando depois.

## Limites e próxima etapa

Sem frontend: login ao abrir/recarregar/restaurar, CSP/renderização segura, cache e classificação de polling devem ser implementados/validados em B19. Token em memória não elimina risco de XSS. Não declarar SC-005 concluído pelo teste HTTP.

Nenhuma conta administrativa real foi criada; criação exige execução interativa do [guia](quickstart.md). Sem SMTP, Supabase Auth, Evolution, Gemini, Maps, hospedagem, envio WhatsApp ou teste com alunos reais. Registros técnicos sem expurgo automático; retenção para uso real continua pendente. Próxima etapa externa: Evolution/Baileys com número separado.

Conferência final: nenhuma migração pendente em dev/test; 20/20 tarefas concluídas, links dos artefatos válidos e diff sem erros de whitespace. Clusters privados dev/test, inicialmente parados e iniciados para validação, foram encerrados ao terminar. Não houve criação de branch, commit ou publicação nesta execução.
