# Verificação de Maps e rotas — 12/11/2026

## Resultado

Geocoding e Routes retornaram HTTP 200 com a chave corrigida. Endereço público testado: Rua Caramuru, 271, Pato Branco/PR. Maps JavaScript carregou no navegador sob http://127.0.0.1:5173 sem erro de autorização. Chaves lidas de arquivos privados ignorados pelo Git, valores não emitidos nos logs.

A API dev foi reiniciada com o build que injeta GOOGLE_MAPS_API_KEY da configuração. Health ready HTTP 200, frontend HTTP 200 e endpoint Maps sem autenticação HTTP 401.

## Testes

- 20 testes backend distintos aprovados nas suítes de adapter Google Maps (3), locais com PostgreSQL (12), HTTP de locais/Maps (3) e itinerário (2). Reexecução focada confirmou que uma alteração concorrente do endereço durante Routes descarta a resposta como PREVIEW_CHANGED.
- 15 testes de navegador aprovados. Novo cenário confirma a ordem origem → pontos → destino, exige conferência explícita e remove o percurso após editar endereço.
- Tipos backend/frontend, lint dos arquivos alterados e builds aprovados. ESLint completo inicialmente apontou apenas formatação de fixture e conversão de tipo no teste novo, ambas corrigidas e revalidadas.
- Ensaio real navegador → NestJS → PostgreSQL test → Google: usuário temporário operator em test, identidade simulada somente no ensaio e removida ao final. Geocoding de dois endereços públicos, seleção/conferência, Routes e desenho da polyline reais. Percurso retornou 0,9 km / aproximadamente 4 minutos. Zero erro Maps, mapa presente, sem overflow horizontal a 390px. Autenticação real continua coberta pelos testes existentes, não foi refeita com senha da usuária.
- Evidências locais: tmp/maps-tests.log, tmp/maps-browser-tests.log, output/026-maps-real-desktop.png, output/026-maps-real-mobile.png. As capturas precedem ajuste dos textos de sucesso de busca/cálculo e ocultação do filtro de passageiros no trecho direto.

## Limites da entrega

Prévia por grupo ou trecho direto. Geocodes, conferência da equipe e percurso ficam somente em memória da tela. Ao reabrir ou atualizar pontos, é necessário localizar/conferir novamente. Até 25 intermediários. Duração de condução sem trânsito ao vivo e sem tempo de embarque. Adequação ao ônibus depende de revisão da equipe. Avisos de chegada às 18h e acompanhamento da posição permanecem proposta futura.

Próxima validação da equipe: informar garagem e destino reais, escolher um grupo e conferir cada entrada/parada no mapa antes de calcular. Nenhuma coordenada operacional foi inventada ou gravada nos cadastros.

Verificação adicional aprovada: local de viagem legado ausente do catálogo fixo bloqueia cálculo com MAPS_POINT_UNAVAILABLE, preservando a obrigação de revisar a parada.

## Correção de extremos por grupo — 18/11/2026

- [x] Origem e destino passam a ser o primeiro e o último ponto da ordem padrão do grupo, inclusive sem passageiros. Intermediários no modo do dia continuam filtrados pela demanda; catálogo inclui todos os pontos ordenados.
- [x] Tela remove extremos avulsos nos grupos, identifica origem/destino e não duplica pontos. Trecho direto mantém entrada manual. Um único ponto não permite cálculo; extremo indisponível bloqueia a prévia.
- [x] Backend valida a sequência inteira de IDs, incluindo extremos, e mantém revalidação antes/depois do provedor. Sem migração ou alteração de credenciais.
- [x] 12 testes de integração de locais aprovados em PostgreSQL test: extremos sem passageiros preservados, intermediário vazio omitido, ordem invertida rejeitada e mudança concorrente invalida percurso.
- [x] Teste Playwright de Maps aprovado: dois pontos do grupo enviados diretamente como origem/destino, conferência obrigatória e edição invalida percurso. Build frontend aprovado. Google simulado; nenhum cálculo real cobrado nesta verificação.

Os registros de 12/11 sobre informar garagem/destino avulsos valem agora somente para trecho direto/intermunicipal.

- Verificações finais: build backend e ESLint dos arquivos backend alterados aprovados; git diff --check sem erros.
