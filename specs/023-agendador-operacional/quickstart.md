# Verificação e ativação

Usar Node local e banco test via scripts/local-postgres.ps1. Executar `test/unit/operational-scheduler.spec.ts` e `test/integration/messages.spec.ts`, depois regressão. Relógio sintético cobre05h/11h/13h/16h/17h/22h; transporte substituto não contata alunos.

Ativação futura: definir `OPERATIONS_SCHEDULER_ENABLED=true` no ambiente do backend dedicado à operação. Evolution configurado e envio+allowlist são necessários para contato real. Com envio desabilitado, a rotina prepara mensagens e fecha jornadas, sem reservar tentativas de envio. O launcher `painel-local.ps1` desabilita a rotina no processo. Manter processo/banco ligados; hospedagem segue pendente. Não habilitar flag privada durante testes automatizados.
