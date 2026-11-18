# Pesquisa

`MessageService.tick` já seleciona última faixa do dia e chama `closeDay` após17h; `prepare` preserva unicidade aluno/data/faixa e supera anteriores. `dispatch` revalida conteúdo, reserva mensagem+tentativa antes de chamar sender; `EvolutionSender` reserva ledger e trata resultado incerto sem retry. Reutilizar essas funções em vez de cron externo.

Lacuna encontrada: erro de preparação de um aluno interrompe tick inteiro. Isolar a falha e registrar código seguro. Rotina opt-in separada do envio permite verificar fechamento sem mensagens externas. Dois processos podem avaliar a mesma faixa, mas somente um reserva uma mensagem para transporte. Um único processo não sobrepõe ciclos. Persistência existente dispensa migração.
