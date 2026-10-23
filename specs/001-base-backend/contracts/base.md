# Contratos mínimos implementados — B02

Aprovados e implementados no incremento; não tornam definitivos os endpoints futuros de [docs/api.md](../../../docs/api.md).

| Interface | Entrada | Saída/erro |
| --- | --- | --- |
| Clock.now | nenhuma | instante Date válido; produção SystemClock, teste FixedClock |
| operationalDate | instante válido | data YYYY-MM-DD em America/Sao_Paulo, sem depender do fuso do host |
| DatabaseProbe.check | nenhuma | Promise de disponível/indisponível; timeout 2s; sem credencial no resultado |
| CheckReadiness.execute | dependências Clock/DatabaseProbe injetadas | status ok/unavailable e checkedAt ISO UTC |
| GET /health/live | nenhuma | 200, JSON status=ok; não consulta banco |
| GET /health/ready | nenhuma | 200 status=ok ou 503 status=unavailable, checkedAt ISO UTC; sem detalhes de conexão |

As duas rotas técnicas são locais e não retornam dados operacionais. Não criar rota de login, CRUD ou bypass de autenticação; autorização do produto começa em B03. Controller traduz resultado; caso de uso conhece portas, não TypeORM ou Express. Adaptador Postgres faz probe mínimo com timeout e libera recursos; indisponibilidade não derruba a rota de liveness. Pool deve poder iniciar preguiçosamente para prontidão devolver 503 mesmo com banco fora.

Configuração ausente/inválida interrompe bootstrap com nome do campo e código seguro. Scripts de teste validam alvo antes de criar DataSource: somente 127.0.0.1:55433/techbus_test e usuário exclusivo de teste, rejeitando qualquer substituição por dev/externo. Binários/portas diferentes exigem ajuste explícito do contrato e dos testes, não fallback.

Scripts npm disponíveis: build, lint, test, test:integration, test:e2e, start:dev, migration:show, migration:run, migration:revert. Comandos de migração recebem ambiente explicitamente; nenhuma migração roda automaticamente no bootstrap. Testes de migração usam fixture, nunca migrações em um banco externo.
