# Decisões técnicas B05
- Sem nova pesquisa de versões: reutilizar pins e lockfile B02–B04 e infraestrutura local validada.
- Calendário inicial não configurado (days=null), diferente de semana configurada vazia ([]). Nenhum dia presumido. Exceção explícita pode habilitar data em ambos os casos.
- Uma revisão por universidade cobre semana/exceções; evita perda silenciosa de atualização. Linha de calendário provisionada para cada universidade, sem dias de operação.
- Exceção opera=true/false; opera=null restaura herança da semana e preserva registro/motivo. Não introduz exclusão nem política de retenção.
- Reutilizar protocolo PostgreSQL de locks/READ COMMITTED documentado em [pesquisa B04](../003-cadastros-vigencias/research.md); snapshot consistente dos dados usados por avaliação. Avaliação não confirma e não substitui revalidação em futuro comando.
- Tempo: data e hora locais por Intl America/Sao_Paulo; pedido usa Date do recebimento durável fornecido pelo consumidor interno, nunca hora de interpretação. Clock substituível apenas para consulta atual. Datas futuras não representam confirmação antecipada.
- A decisão de Taís foi confirmar efeito imediato em novas avaliações, preservação de confirmações existentes e ausência de envio automático. Não há pendência de negócio B05.
