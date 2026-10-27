# Research B12
- Decisão: demanda projetada de jornadas existentes, token opaco sobre revisões/pendências/contexto. Evita contadores divergentes; nenhuma confiança em contagens do cliente.
- Decisão: separar rascunho e fotografia confirmada. Editar rascunho não libera veículo; só substituir após validação bem-sucedida.
- Decisão: reutilizar lock de locais/jornadas, adicionando recepção à mesma ordem. Alternativa de locks independentes rejeitada porque permitiria chegada/mudança de demanda entre leitura e confirmação.
- Decisão: transação única para validação e ocupações. Sem extensão de banco nova; serialização de escritores pela barreira já existente, índices e testes concorrentes reais. Application role não recebe DELETE.
- Decisão: períodos absolutos resolvidos em America/Sao_Paulo, sem hardcode de offset. Faixas relativas B11 são convertidas para comparar datas adjacentes.
- Decisão: manter avaliação B11 e capacidade/cobertura como regras separadas; uma seleção intermunicipal por universidade e uma por grupo/sentido na entrega, sem repartição automática. Demanda zero não exige alocação.
- Aprovação antes do fechamento vedada; maior disponível/suficiente permitido por decisão manual. Nenhum desconhecido técnico ou nova escolha de infraestrutura.
