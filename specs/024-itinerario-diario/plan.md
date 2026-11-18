# Itinerário e disponibilidade por dia

Decisão de Taís em 11/11/2026: três abas Ida, Volta e Intermunicipal; prévia, escolha de veículo e planejamento integrados. Painéis por grupo com filtro. Recomendação somente intermunicipal, menor disponível para max(ida, volta). Um veículo por grupo/etapa e uma universidade por veículo intermunicipal; reuso entre etapas sequenciais permitido. Disponibilidade por dia, sem horários operacionais. Prazos de mensagens/aluno preservados.

## Plano e validação

- [x] Disponibilidade semanal booleana e exceção por data; preservar dados antigos sem presumir disponibilidade integral.
- [x] Alocação por dia/etapa; concorrência, capacidade e revisão preservadas.
- [x] Três abas com prévia, filtros, escolhas e recomendação integrada; remover navegação Planejamento.
- [x] Consulta administrativa e do motorista somente da data atual; ao virar o dia, outra operação.
- [x] Validar backend, navegador, tipos, lint/build e documentação.

Interfaces de teste: serviços públicos FleetService e OperationService com PostgreSQL isolado (disponibilidade, exclusividade e confirmação); navegador do painel (abas, filtro e escolhas). Reutilizam as interfaces e infraestrutura de testes B11/B12/B19, conforme autorização de implementação integral e testes do projeto. Não testar métodos privados.

Design: preservar Segoe UI e paleta existente (#176354, #20313d, #f5f7fa, #d8e1e6, #ffffff). Abas destacam o sentido da viagem; cabeçalho por grupo reúne demanda e veículo, seguido da prévia. Ordem padrão fica expansível. Alinhamento à esquerda e controles responsivos, sem redesenhar o restante do painel.

Verificação concluída em [evidências](verification.md): 507 testes backend distintos considerando reexecuções, 13 testes de navegador, tipos/lint/build aprovados.
