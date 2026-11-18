# Preparação dos pontos para Google Maps

12/11/2026 — Integração Maps implementada e verificada em specs/026-mapas-rotas/verification.md. Mapa administrativo e prévia de percurso com Geocoding, Routes e Maps JavaScript, ordem manual, origem/destino explícitos, distância/duração estimada. Escolhas geográficas e respostas Google somente na sessão da tela. Avisos de chegada aos alunos são proposta posterior. Este incremento supera a indicação de Maps inteiramente futuro nos registros anteriores.

Pesquisa de 11/11/2026, solicitada por Taís. **Cadastro próprio estruturado implementado em specs/025-enderecos-pontos; integração Maps ainda futura.** Não reintroduz cálculo automático no escopo vigente nem valida endereços existentes. Sem chamadas às APIs Maps ou alteração de credenciais. Migração aditiva apenas para dados próprios.

## Situação antes do incremento 025

Embarque e desembarque fixos guardam nome, endereço descritivo, grupo, atividade e versão. O endereço é texto obrigatório de até 1000 caracteres; a validação atual verifica formato/tamanho, não existência geográfica. O endereço pode misturar rua e instrução ao motorista. Não há localização de parada confirmada nem vínculo Google nos catálogos.

Pontos de desembarque usam return_locations com provider=company-fixed; não substituir esse identificador nem external_key por um Place ID. Isso mudaria a identidade dos pontos e poderia afetar padrões, jornadas e publicações. O adaptador automático de itinerários atual está desativado e foi desenhado para coordenadas/ordenação; não representa integração Maps pronta.

## Cadastro recomendado

Separar três informações, igualmente para embarque e desembarque:

1. **Identificação operacional:** nome do ponto e referência para o motorista (por exemplo, “portão lateral, depois da esquina”). Grupo/sentido continuam manuais.
2. **Endereço informado pela empresa:** logradouro, número como texto (inclusive letras) ou indicação explícita sem número, bairro, município, UF, país e CEP quando conhecido. Complemento separado da referência de parada. Não exigir número/CEP inexistentes de uma praça ou esquina. Para pontos convencionais, rua + município + UF + país dão o contexto mínimo de busca; pontos não convencionais continuam podendo usar descrição e futura seleção no mapa.
3. **Localização para navegação:** vínculo opcional ao provedor (Place ID), origem da informação, resultado/precisão da busca, revisão do endereço consultado, instante da consulta e confirmação da parada pela equipe. Coordenadas próprias, se disponíveis, ficam identificadas pela origem; coordenadas retornadas pelo Google seguem suas regras de armazenamento, não são copiadas indefinidamente para o cadastro próprio.

Preservar o endereço atual como texto legado. Não tentar decompor automaticamente descrições antigas em campos “confirmados”. Novos dados estruturados podem coexistir durante a revisão dos cadastros. O UUID do ponto permanece a referência de alunos, grupos e viagens. Não criar dependência de Maps para usar o itinerário manual.

## Como funcionaria a integração

1. **Localizar:** Places Autocomplete oferece candidatos enquanto a equipe digita, com país/área de busca configurados. Geocoding pode procurar um endereço já cadastrado, devolvendo localização e indicadores de precisão. Resultado parcial, aproximado ou múltiplo exige revisão; um resultado encontrado não é confirmação automática do ponto. [Autocomplete](https://developers.google.com/maps/documentation/places/web-service/place-autocomplete), [Geocoding](https://developers.google.com/maps/documentation/geocoding/guides-v3/requests-geocoding).
2. **Conferir endereço postal quando útil:** Address Validation tem cobertura para Brasil e indica componentes ausentes, corrigidos ou não confirmados. O fluxo deve decidir entre corrigir, confirmar ou aceitar a sugestão. É uma ferramenta complementar; validar um endereço postal não determina o lado da rua ou entrada de embarque. Para esquina/praça, a confirmação geográfica da parada é mais relevante do que exigir endereço postal completo. [Cobertura](https://developers.google.com/maps/documentation/address-validation/coverage), [Lógica de validação](https://developers.google.com/maps/documentation/address-validation/build-validation-logic).
3. **Confirmar a parada:** mostrar o candidato no mapa e permitir à equipe conferir a entrada/esquina. Distinguir “encontrado pelo fornecedor” de “parada conferida pela equipe”. Se a equipe ajustar a parada, não continuar enviando silenciosamente o Place ID de um prédio diferente do marcador escolhido.
4. **Calcular percurso:** enviar origem, destino e paradas confirmadas para Routes API. O Google recomenda Place IDs para localização inequívoca; coordenadas também são aceitas. Somente texto exigiria nova interpretação e poderia apontar para outro local. Coordenadas podem ser ajustadas à via mais próxima, que nem sempre é a entrada desejada. [Localizações na rota](https://developers.google.com/maps/documentation/routes/specify_location).
5. **Manter a operação:** preservar ordem manual dos grupos e somente os pontos com passageiros confirmados. Desenhar um caminho seguindo essa ordem é distinto de otimizar/reordenar paradas. O segundo continua fora da entrega. Falha da API mantém o itinerário manual e sinaliza indisponibilidade; não inventa percurso nem publica automaticamente.

A opção vehicleStopover pede análise adicional de adequação da via à parada, mas não substitui a avaliação local da empresa. Modos de viagem e restrições do veículo precisam ser avaliados antes de usar para ônibus: DRIVE descreve carro de passeio e TRANSIT transporte público existente; não presumir que isso valida uma rota fretada para a frota. [Paradas](https://developers.google.com/maps/documentation/routes/stop_over), [Modos de viagem](https://developers.google.com/maps/documentation/routes/reference/rest/v2/RouteTravelMode).

## Cuidados do desenho

- Place ID não substitui o ID interno, pode mudar e deve ser reconsultado quando desatualizado. O Google recomenda renovar referências com mais de 12 meses. Não presumir tamanho máximo fixo de 200 caracteres nem reutilizar external_key legado. [Place IDs](https://developers.google.com/maps/documentation/places/web-service/place-id).
- Separar dados da empresa e conteúdo do fornecedor. Place IDs têm exceção de armazenamento; demais respostas, coordenadas e endereços formatados devem seguir condições específicas de cache, exibição e atribuição aplicáveis na integração. Não desenhar persistência ilimitada do JSON retornado. [Políticas de Geocoding](https://developers.google.com/maps/documentation/geocoding/policies).
- Backend verifica autorização e resultado do fornecedor; não aceitar flags do frontend/IA como prova de validação. Consulta externa fora da transação; ao salvar, revalidar versão/endereço para não anexar resultado a cadastro já alterado.
- Alterar endereço ou localização invalida a confirmação geográfica daquela revisão; mantém o ponto e suas referências, sinalizando revisão do percurso. Mudar apenas o nome operacional não desloca a parada.
- Sem resposta ou ambiguidade: estado pendente, mantendo uso manual. Grupo/área de atendimento não são inferidos da geocodificação.

## Incremento sugerido

Primeiro: estruturar o endereço próprio, separar referência de parada e preservar texto legado; testes de gravação/edição, pontos sem número, compatibilidade e versões. Depois, caso a integração seja retomada: habilitar busca/mapa, vincular candidato conferido e calcular percurso em adaptador próprio, com quota/custos/chaves e política de dados definidos. Apenas acrescentar latitude/longitude vazias agora não comprovaria prontidão nem validação.

O primeiro incremento foi autorizado e implementado: campos estruturados, referência separada e preservação do legado. Esta pesquisa e a validação estrutural não confirmam a localização de qualquer ponto cadastrado.
