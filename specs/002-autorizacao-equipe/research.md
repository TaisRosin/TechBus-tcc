# Decisões técnicas — B03

Reutilizar matriz executável da [B02](../001-base-backend/research.md); sem repetição de pesquisa de versões ou nova instalação.

| Decisão | Fundamentação | Alternativa rejeitada |
| --- | --- | --- |
| Guard global com declaração pública explícita somente em health | Rotas esquecidas não ficam abertas; metadados por ação | Guard opcional por controller |
| Verificador de identidade por porta; padrão indisponível | Supabase real é B18; fake só em test/ via overrideProvider | JWT próprio ou header de papel aceito |
| Um perfil fixo por usuário, matriz central | Resposta explícita da usuária | Permissões customizadas/múltiplos perfis |
| Registro mínimo de equipe com subject único e revisão | Permissões locais atuais não vêm do cliente/token | Papel confiado ao token |
| Transação READ COMMITTED com advisory lock transacional único para mutações de acesso | Serializa alterações, relê ator e contagem após lock, protege último admin inclusive concorrência | Contar e atualizar sem lock; mutex só em memória |
| Porta de atribuição consultada para leitura do motorista | Não antecipar modelagem de viagens B11/B15 | Aceitar driverId enviado pelo cliente |
| Revisão esperada obrigatória | Repetição/desatualização não repete alteração | Atualização cega |

Fontes primárias consultadas em 22/10/2026: [guards Nest](https://docs.nestjs.com/guards) e [locks PostgreSQL 17](https://www.postgresql.org/docs/17/explicit-locking.html). Advisory locks transacionais liberam ao término da transação; por serem cooperativos, toda mutação de acesso exposta pela aplicação deve usar a mesma operação transacional. SQL manual do proprietário do banco não é uma interface de usuário.

Sem dúvidas restantes no escopo. Sessão real, convite/reenvio/recuperação/e-mail e inicialização administrativa real ficam em B18, preservando procedimentos aprovados. B03 não confirma envio, não ativa usuários por convite fictício e não oferece bootstrap público.
