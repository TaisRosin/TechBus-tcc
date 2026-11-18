# Verificação — 04/11/2026

Primeiro painel B19.1 implementado sobre os contratos existentes. Sem alteração de schema ou das regras de negócio do backend.

- TypeScript: `tsc --noEmit` aprovado.
- Vite: build aprovado; bundle principal 318,94 kB (97,53 kB gzip).
- Playwright/Edge: **9/9 cenários aprovados**, desktop e celular: sessão em memória/recarga, perfil motorista/401, senha temporária, correção com versão e conflito, cadastro com zero dias habituais, largura móvel, falha de carregamento sem correção disponível, rascunho com versão/demanda e itinerário pendente sem publicação.
- Ensaio separado `frontend/scripts/real-smoke.cjs`: navegador → proxy Vite → NestJS → PostgreSQL test. Login real, criação de aluno com vigência e zero dias habituais, conferência SQL, leitura de calendários/catálogos/frota/planejamento/itinerários/mensagens e logout aprovados, sem erros JavaScript. Conta e aluno sintéticos exclusivos removidos ao final. Evolution, processamento, envio e Gemini desativados nesse processo.
- Capturas locais inspecionadas: `.local/frontend-mobile.png` e `.local/frontend-real-students.png` (não versionadas).
- Os testes iniciais identificaram associação inadequada dos rótulos e reutilização dos campos entre login/troca de senha; corrigidos antes da suíte final. No ensaio real, corrigida a espera de requisições do próprio roteiro.

## Limites

Não equivale a teste completo de WhatsApp ou da noite operacional. B18.3/T019, falhas manuais relatadas por Taís, contexto B18.4, geografia real e execução dos horários/fechamento continuam pendentes. As nove provas de navegador usam respostas substitutas; o ensaio real cobre cadastro e consultas, não confirma viagens ou publica itinerários com dados reais. A regressão histórica do backend não foi reexecutada por mudanças exclusivamente no painel e launchers.

Exceção de disponibilidade oferece uma faixa por data nesta primeira interface; gestão/recuperação de contas existentes permanece no backend/CLI. Endereço novo mantém a indisponibilidade geográfica real, sem fingir aceitação. Cálculo de rotas e sugestão da quarta utilização ficaram fora da entrega conforme decisão de Taís; código histórico não foi apagado.

## Uso e continuidade

[Instruções de início](../../frontend/README.md). Login com conta existente, sem credencial padrão. Launcher do painel usa dev e desliga provedores apenas no próprio processo, sem editar configuração privada. Próxima fatia: testar a operação pela interface com Taís e resolver bloqueios de locais/fechamento; integrar contexto e retomar o ensaio completo do canal.
