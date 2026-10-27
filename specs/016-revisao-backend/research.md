# Pesquisa e revisão B17
- Decisão: reutilizar as 328 verificações B16 e acrescentar travessia entre módulos, em vez de duplicar todas as regras. Motivo: maior lacuna inicial é evidência contínua de mensagem/jornada/planejamento/publicação. Alternativa descartada: reescrita ampla ou mocks dos serviços internos.
- Decisão: testar com serviços reais e PostgreSQL local, relógio e envio/validação geográfica simulados. Nenhum fornecedor, infraestrutura ou versão nova.
- Decisão: matriz distingue núcleo local verificado de integração real pendente. R02/R08/R12/R19/R20/O01 têm dependências externas explícitas; nenhum teste sintético prova entrega WhatsApp, identidade Supabase, compreensão IA ou rota viária.
- Revisão técnica complementar solicitada para transações/listas/publicação B12–B16; achados comprovados serão registrados na verificação e receberão regressão.
