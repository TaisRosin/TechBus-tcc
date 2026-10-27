# Pesquisa B16
## Decisões locais
- Decisão: separar ordem padrão da publicação do dia. Motivo: Q2 impede reordenação silenciosa para o motorista. Alternativa descartada: ler ordem padrão ao vivo como publicada.
- Decisão: publicação exige preview atual e plano confirmado B12; identifica versão do plano. Motivo: não publicar passageiros de rascunho ou de atribuição substituída. Cancelamentos continuam filtrados sem nova publicação.
- Decisão: IDs canônicos B06, paradas compartilhadas agrupadas por ID, sem deduplicação textual/geográfica inventada. Uma ordem por grupo/sentido; versões e lock de locais preservam edição concorrente.
- Decisão: reutilizar versões/dependências B15. Nenhuma mudança de infraestrutura ou fornecedor. TDD nas interfaces já adotadas.
## Viabilidade do automático
A documentação oficial do [Google Routes](https://developers.google.com/maps/documentation/routes/opt-way), consultada em 26/10/2026, descreve reordenação de paradas intermediárias e retorno dos índices da sequência; isso permite avaliar ordenação dentro de um grupo predefinido. Não implica agrupamento de alunos ou recomendação de frota.
Inferência para TechBus: viável em princípio, condicionada à escolha/autorização de fornecedor, resolução geográfica dos locais e âncoras (origem/fiscalização/universidade), cobertura/restrições viárias e limites adequados aos veículos. Cadastros atuais possuem texto e identidade externa, sem coordenadas ou compatibilidade comprovada com roteamento. Não há dados suficientes para integração real nem comprovação de qualidade do trajeto.
B16 prepara porta simulável e rejeição de resultado que omite/duplica/inventa paradas; padrão indisponível. Não implementa heurística própria, não conecta Google/OSRM, não assume preços/gratuidade. B18 deverá testar amostras locais, falhas/sem rota, restrições de veículos e revalidar demanda antes de publicar resultado. O01 continua prioritário; o manual é contingência exercitável agora, não decisão de abandono.
