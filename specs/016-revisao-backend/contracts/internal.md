# Contratos de revisão B17
Nenhum endpoint novo. Observar interfaces públicas de JourneyService, MessageService, OperationService, ConsultationService, CorrectionService, ItineraryService e cadastros existentes. Autorização HTTP permanece coberta pelas suítes e2e existentes.
Dados simulados não podem usar bypass de autenticação no runtime normal. Relógio controla recebimento/fechamento/cancelamento; atraso de interpretação não altera instante durável. Adaptador de mensagem simula falha; nenhum envio real.
A revisão produz cobertura e evidências, não promessa de produção. Integrações B18 ainda precisam de identificação confiável, configuração de Supabase Auth, envio/reconciliação, IA, geografia e rotina externa.
