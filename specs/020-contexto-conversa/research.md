# Pesquisa local — 05/11/2026

Evolution 2.3.7 instalada em `.local/evolution-api-2.3.7` (somente leitura): `src/api/integrations/channel/whatsapp/whatsapp.baileys.service.ts`, método prepareMessage, preserva message e projeta contextInfo do conteúdo. Handler messages.upsert envia messageRaw ao webhook. `node_modules/baileys/WAProto/index.d.ts`, IContextInfo, define stanzaId, participant, quotedMessage e remoteJid.

O TechBus hoje guarda texto, identidade/instância e original_order, mas descarta contextInfo. O envio já guarda provider_id; é possível cruzar o ID citado com uma pergunta persistida para o mesmo aluno, telefone, instância e operação. Não confiar em quotedMessage/texto citado, nem presumir vínculo pelo último envio. Citação não estabelece ordem: manter validação original_order e received_at separadas. Quando os campos não vierem ou forem inconsistentes, preservar pendência.

Evidência de código local, não ensaio de citação real no WhatsApp. Testes sintéticos devem cobrir contextInfo no conteúdo e na projeção superior, conflito entre ambos, remetente errado, reentrega e troca de dia. Ensaio real continua necessário.

Decisão de Taís em 05/11: uma pergunta por esclarecimento; persistindo ambiguidade, equipe assume sem repetição automática. Recebimento antes das 17h para novos esclarecimentos; após isso somente cancelamento válido de volta até 22h. Mapas e quarta utilização fora do escopo; resolução usa pontos fixos cadastrados.
