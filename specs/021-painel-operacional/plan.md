# Plano de implementação

Reutilizar backend NestJS sem mudar regras ou persistência. Frontend React/TypeScript com Vite, Tailwind e componentes shadcn/ui locais; dependências verificadas no registry e fixadas em lockfile. Proxy /api em desenvolvimento/preview para 127.0.0.1:3000, bind 127.0.0.1. Testes usam servidor isolado, sem .env real.

Estrutura: frontend/src/lib/api.ts (sessão/erros), types.ts (contratos), components/ui/ (base), pages/ (fluxos), App.tsx e styles.css. Playwright para fluxos críticos, screenshots desktop/mobile. Bootstrap de teste deve usar configuração test e transportes desligados.

Design: painel de despacho, tabela de passageiros como elemento principal; navegação lateral compacta, ferramentas e filtros acima da lista, formulários em painéis claros. Paleta: papel #f5f7fa, branco #ffffff, texto #20313d, verde #176354, borda #d8e1e6, alerta #a86115. Segoe UI/system para controles e leitura, números tabulares. Sem cards decorativos, gráficos inventados, fotos ou animação desnecessária; tabelas roláveis em celular e foco visível. A identidade vem do percurso coleta → universidade → distribuição e da operação noturna, não de um dashboard genérico.

Constituição I–V: decisão posterior de Taís autoriza antecipar frontend; regras/autorização continuam no backend; testes de sessão e comandos antes de implementação; nenhum envio real nesta verificação. Tarefas Spec Kit enxutas, sem aprovação individual. Não gerar novo schema por esta entrega.
