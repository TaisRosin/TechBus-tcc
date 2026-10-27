# Contratos — B08
Internos, sem endpoint público novo:
- JourneyService.close(studentId,date): data ISO válida, fechamento devido pelo relógio backend; retorna jornada e pendências. CLOSURE_NOT_DUE antes das 17h da data. Não cria confirmação para jornada inexistente.
- JourneyService.closeDay(date,afterStudentId?,limit=100): lote limitado (1..100), ordenado por aluno; resultados/erros por jornada e cursor para continuar. Executor futuro repete com segurança. Datas passadas somente na operação interna, sem consulta pública de histórico.
- apply(studentId,receiptId,{kind:cancel_return}): recebimento em [17h,22h), ordem conhecida; RETURN_NOT_CONFIRMED se não existe volta confirmada nem interpretação anterior pendente. Já cancelado é sucesso sem efeito repetido. Horário fora da janela rejeita; mensagens ordinárias pós-17 continuam rejeitadas.
- Cancelamento dependente de interpretação anterior: pending/AWAITING_TIMELY_COMMAND, posteriormente atualizado com resultado conciliado. Registro é preservado, sem criar viagem presumida.
- today(admin/operator,student): leitura do dia inclui campos de fechamento/cancelamento, pendências de interpretação e guidance (código/texto determinístico para futuro envio). Sem efeito de fechamento por leitura; campos refletem processamento realizado. Sem promessa de envio.

A aplicação de resposta recebida antes de 17h concilia fechamento se já devido. Repetições retornam resultado registrado; comando antigo não reverte cancelamento. Sem mudança de contrato de autenticação HTTP. Agendamento e envio fora do incremento.
