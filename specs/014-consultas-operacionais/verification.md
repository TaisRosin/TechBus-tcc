# Verificação B15 — consultas operacionais e motorista

Data: 26/10/2026. Q1/Q2 aprovadas conjuntamente; fluxo Spec Kit com especificação, checklist 16/16, plano, pesquisa, modelo, contrato e tarefas. Constituição preservada; nenhum hook configurado.

## Entrega
- Consulta administrativa com respostas, origens, contagens por universidade/sentido/grupo/local, pendências e comunicação, sem alterar a jornada.
- Vínculo exclusivo conta/motorista, somente admin, com versão esperada e proteção de concorrência.
- Motorista ativo e vinculado consulta somente seus trechos confirmados e respectivos passageiros/telefones; rascunhos não concedem acesso.
- Cancelados excluídos imediatamente; mudança de grupo não transfere automaticamente passageiros entre trechos locais. Associação intermunicipal continua por universidade/sentido. Revisão mantém atribuição com alerta.
- Operação anterior consultável somente até o fim previsto do último trecho confirmado, sem histórico ou reabertura de comandos.
- Manifesto imutável por versão confirmada; plano anterior sem manifesto exige reconfirmação para publicar passageiros.

## Validação
TDD com falhas iniciais por domínio, tabela, serviço e rota ausentes. Oito testes novos em quatro suítes cobrem janela/limite exato, sentidos, autorização HTTP, conta/perfil/cadastro inativos, acesso alheio, vínculo concorrente/revogado, confirmação B12, cancelamento, alteração de grupo, manifesto ausente, leitura sem mudança da jornada, privilégios e reversão com evidências.

Regressão final: **317/317 testes em 56 suítes**, Jest --runInBand, 146,731 s. Build, lint e tsc --noEmit aprovados. Migração OperationalQueries1793800000000 aplicada somente nos bancos PostgreSQL locais dev/test; aplicação sem DELETE dos vínculos e sem UPDATE/DELETE dos manifestos.

## Ocorrências e limites
Nove tarefas concluídas. Reversão com tabelas vazias e reaplicação conferidas em teste; dev/test sem migrações pendentes e sem dados sintéticos remanescentes nas tabelas operacionais verificadas. Registros anteriores do projeto preservados. Links locais conferidos em 140 documentos; git diff --check sem erros. Ambos os PostgreSQL locais encerrados ao finalizar.

Corrigida exportação de tipo necessário à compilação do controller e formatação apontada pelo lint. Uma execução falhou porque o PostgreSQL local estava parado; bancos reiniciados e regressão aprovada. O bloqueio anterior por limite da revisão automática deixou de ocorrer nesta retomada.

Sem frontend, autenticação/WhatsApp/mapas reais ou alterações de infraestrutura. Leituras consolidadas percorrem os alunos da operação; não foi realizado ensaio de carga em produção. Confirmação não comprova presença. Integrações reais permanecem B18, interface B19.

Próxima etapa: B16 — trajeto e contingência. Nenhum commit automático realizado.
