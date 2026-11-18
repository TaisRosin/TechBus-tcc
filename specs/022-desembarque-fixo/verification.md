# Verificação — 04/11/2026

Implementados catálogo de pontos fixos, padrão por referência, correção diária pelo painel e integração com jornada, demanda, recibos e itinerário manual. Contratos em [contracts.md](contracts.md).

- Backend: 462 testes distintos/78 suítes aprovados considerando reexecução. A execução completa teve 461 aprovados e uma falha por conexão recusada no banco dev; após iniciar dev, `test/integration/migrations.spec.ts` passou. Uma execução anterior foi interrompida com test indisponível. Não houve falha de regra remanescente.
- O cenário integrado de itinerário passou a usar pontos fixos: confirmação, fechamento, planejamento, publicação explícita, consulta do motorista e retirada de parada após cancelamento. Testes de catálogo verificam sentido, versão, inativação, preservação da referência e ausência de uso do validador geográfico.
- Tipos, lint e build do backend aprovados. Tipos/build frontend aprovados.
- Playwright/Edge: 10/10 testes aprovados. Novo caso cadastra ponto de desembarque somente em grupo de volta e envia padrão por locationId.
- Ensaio real `frontend/scripts/real-smoke.cjs`: navegador → Vite → NestJS → PostgreSQL test; cadastro de grupo/ponto e padrão pela interface, referência confirmada por SQL, login/consultas/logout sem erros JavaScript. Dados sintéticos exclusivos removidos. Sem WhatsApp/Gemini. Captura inspecionada em `.local/frontend-fixed-dropoff.png`.
- Migração1794600000000 aplicada em test e dev, preservando registros existentes. Reversão destrutiva recusada. API do painel reiniciada com provedores externos desativados; frontend em 127.0.0.1:5173.

## Uso

Em **Grupos e locais**, cadastre um grupo de distribuição e abra **Pontos de desembarque** para cadastrar nome/endereço/grupo. Em **Alunos → Vigência e locais**, selecione o ponto habitual. Em **Operação do dia → Revisar**, selecione outro ponto para correção da jornada com justificativa. Em **Itinerários**, inclua os pontos na ordem manual do grupo.

## Limites preservados

Endereços legados não viraram pontos fixos automaticamente; suas referências antigas continuam legíveis. A API atual não cria endereço livre nem faz geocodificação. Helpers internos de compatibilidade B06 permanecem para registros/testes anteriores. Interpretação de nomes de pontos pelo WhatsApp, contexto B18.4 e execução automática dos horários/fechamento continuam pendentes; esta entrega não comprova o fluxo real completo de WhatsApp.
