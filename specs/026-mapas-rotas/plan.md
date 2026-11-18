# Mapa e prévia de percurso

Autorizado por Taís em 12/11/2026. Mapa administrativo, geocodificação de endereços, pontos de embarque/desembarque por grupo, percurso na ordem manual com origem/destino informados pela equipe (regra inicial, substituída abaixo para grupos), distância e duração estimada. Seleção dos pontos cadastrados ou somente os confirmados hoje. Trecho direto disponível para intermunicipal.

Consultas Google pelo backend autenticado, chave privada injetada pela configuração. Maps JavaScript no frontend com chave de site. Resultados e escolhas geográficas em memória da tela, sem persistência de conteúdo do fornecedor. Cada busca é explícita e permite escolher um candidato e conferir no mapa. A conferência serve para a prévia, sem promover validação de área ou alterar os cadastros. Mudanças de grupo/endereço invalidam a prévia local. O backend verifica ordem, pontos ativos, pendências e revisão antes/depois da chamada externa. Até 25 intermediários, sem otimização e sem alteração de horários operacionais.

Interfaces de teste existentes utilizadas: adapter HTTP injetável, LocationService/Postgres test, HTTP com IdentityVerifier de teste e navegador Playwright. Chaves e integrações WhatsApp/Gemini preservadas. Estimativa DRIVE sem trânsito em tempo real, sem tempo de embarque. Empresa confere adequação ao ônibus.

Avisos aos alunos às 18h ficam em avaliação posterior. Dependem da definição de saída real, duração de embarques, atualização da posição e política de mensagens. Não tratados como ETA acompanhado ao vivo.

Documentação consultada em 12/11/2026:
- https://developers.google.com/maps/documentation/routes/compute_route_directions
- https://developers.google.com/maps/documentation/routes/intermed_waypoints
- https://developers.google.com/maps/documentation/javascript/load-maps-js-api
- https://developers.google.com/maps/documentation/geocoding/policies

Antes de disponibilização pública, revisar termos/privacidade exigidos pelo fornecedor, cotas e restrições das chaves no domínio hospedado.

Atualização de 18/11/2026: nas rotas por grupo, o primeiro e o último ponto da ordem padrão definem os extremos, mesmo sem passageiros. Apenas intermediários são filtrados no modo do dia. Trecho direto mantém extremos livres. Implementação e testes concluídos em verification.md.
