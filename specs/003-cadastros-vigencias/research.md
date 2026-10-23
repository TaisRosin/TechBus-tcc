# Decisões técnicas B04
- Reutilizar versões/ferramentas B02/B03; sem instalação ou mudança arquitetural.
- Telefone internacional explícito com + e 8–15 dígitos, sem presumir país; remover apenas espaços, parênteses e hífens. Unicidade inclusive inativos. Não comprova número real/WhatsApp.
- Datas ISO reais, inclusivas, PostgreSQL date; relógio operacional existente.
- UNIQUE/FK/CHECK para invariantes locais. Sobreposição entre linhas: lock do aluno antes da consulta em READ COMMITTED, inclusive edição. Sem nova extensão.
- Fundamentação: [restrições PG17](https://www.postgresql.org/docs/17/ddl-constraints.html) e [isolamento PG17](https://www.postgresql.org/docs/17/transaction-iso.html), consultados em 23/10/2026. Consulta após espera por lock vê commits anteriores. SQL administrativo direto não é coberto pelo protocolo da aplicação.
- Revisão esperada em edição; repetição de cadastro/período resulta em conflito sem duplicação, sem replay de resposta. Idempotency-Key geral segue proposta futura.
