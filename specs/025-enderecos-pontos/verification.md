# Verificação — endereços dos pontos

11/11/2026. Incremento autorizado por Taís após a pesquisa de preparação para Maps.

- Backend: 518 testes distintos aprovados considerando reexecução. Execução completa: 517 aprovados e um teste de referência com fixture incompleta; corrigida a fixture para cadastrar a referência no ponto de desembarque efetivamente consultado, suíte de itinerário reexecutada com 2/2 aprovados. Nenhuma falha restante. Evidência local: tmp/addresses-regression.log.
- Novos testes cobrem formatação, número textual/sem número, CEP/UF/campos inválidos, preservação do legado e identidade nos dois catálogos, conflito de versão, compatibilidade com cliente antigo e referência no itinerário do motorista.
- Navegador: 13 testes de regressão aprovados e novo teste de edição legada aprovado (14 distintos), incluindo novo cadastro sem número, conversão explícita e payload com referência separada. APIs simuladas nos testes de navegador; persistência real verificada no PostgreSQL test.
- Tipos backend/frontend, ESLint backend e builds aprovados. Inspeção visual desktop/celular: output/025-address-desktop.png e output/025-address-mobile.png; formulário com rolagem interna.
- Migração aditiva 1794900000000 aplicada em test e dev. Sem remoção de dados, conversão automática de texto ou troca de IDs/grupos/padrões. Campos próprios; sem dados Google.

Validação é apenas estrutural: não confirma existência do endereço, entrada correta, área atendida ou rota adequada ao ônibus. Maps, coordenadas/Place ID, geocodificação e cálculo de percurso permanecem futuros. Credenciais e envio externo não foram habilitados.

Painel atualizado: API reiniciada pelo launcher seguro; /health/ready em 3000 e frontend em 5173 retornaram HTTP 200. Integrações externas desativadas somente no processo do painel.
