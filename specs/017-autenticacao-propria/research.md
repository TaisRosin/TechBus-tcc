# Pesquisa — B18.1

Pesquisa documental em 27/10/2026; não executa autenticação nem comprova compatibilidade de implementação futura.

## Identidade e autorização

**Decisão técnica proposta:** sessões opacas persistidas, adaptadas à porta `IdentityVerifier.verify(token) → subject` existente. Preservar `team_users.id`, `subject` UUID e permissões consultadas no banco; e-mail não substitui subject.
**Motivo:** revogação e prazos no servidor, sem refresh token, JWT ou novo provedor. Alternativas: JWT exigiria controle adicional para revogação; Supabase foi rejeitado pela decisão de Taís.
**Evidência local:** `backend/src/access/application/ports.ts`, `http/access.guard.ts`, `infrastructure/postgres-team-store.ts`. B03 usa lock transacional `(82403,1)` para acesso; criação/reset/bootstrap seguem o mesmo protocolo antes de locks de credenciais/sessões.

## Navegador

**Decisão confirmada:** exigir login também ao recarregar. Proposta: Bearer opaco somente em memória JavaScript no painel, sem cookies de autenticação, localStorage, sessionStorage ou refresh persistente. No carregamento e em `pageshow` de restauração, descartar estado/autenticação e ocultar dados até novo login. B19 deve provar restauração e cache de navegação; não declarar fechamento detectado pelo servidor. Token abandonado permanece limitado pelos prazos/revogação no servidor.
**Motivo:** aproveita transporte B03 e evita restauração de cookies. A [MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie) alerta que restauração pode recuperar cookies de sessão. Alternativa cookie HttpOnly reduz exposição ao JavaScript, mas não satisfaz sozinha a regra aceita. Memória não protege contra XSS ativo: frontend exige renderização segura, CSP e ausência de scripts não confiáveis; validação B19.

## Credenciais e sessões

**Proposta técnica:** `node:crypto` scrypt assíncrono, salt aleatório individual de 16 bytes, N=131072/r=8/p=1, maxmem suficiente (256 MiB), chave derivada de 64 bytes; codificar versão/parâmetros/salt/hash. Comparar em tempo constante; não truncar senha. Verificar custo local antes de liberar incremento; duas derivações simultâneas no máximo por processo, fila limitada de 8, excedente 429.
**Motivo:** evitar dependência nativa adicional; [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) apresenta parâmetros de scrypt como alternativa a Argon2id. A [documentação Node 24](https://nodejs.org/docs/latest-v24.x/api/crypto.html) inclui scrypt e Argon2; este desenho escolhe scrypt, sem alegar indisponibilidade de Argon2 no runtime. Qualquer troca exige verificar estabilidade/suporte e medir custo local.

Senhas definitivas: proposta técnica 15–128 caracteres, permitir espaços e Unicode, sem regras artificiais de composição; rejeitar igual à temporária. Temporária: 24 bytes aleatórios base64url, expira em 24h, nunca persistida em claro. Sessão: 32 bytes aleatórios, persistir apenas SHA-256, escopo `operation` ou `password-change`; escopo restrito nunca aceito pelo verificador operacional. Contexto de troca vence em 10 minutos e nunca além da temporária. Troca consome versão atual e invalida todos os contextos concorrentes; exige novo login após sucesso.

**Sessões:** tempo do servidor com relógio substituível; expira quando `now >= lastActivity + 1h` ou `now >= createdAt + 12h`. Atualização monotônica transacional, nunca revive sessão vencida. Somente requisição autenticada autorizada renova atividade; futuros polls de fundo do painel não renovam inatividade. Logout/reset revogam no banco. Orientação: [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).

**Tentativas:** limite proposto 5 falhas por e-mail normalizado em 15 minutos e 30 tentativas por origem em 15 minutos; armazenar contadores persistidos inclusive para e-mail inexistente, evitar reinício contornar bloqueio. Mensagem externa genérica; contas inexistentes executam derivação fictícia. Após janela permitir nova tentativa sem bloquear indefinidamente a conta; aplicar também no fluxo de troca. Origem é conexão local, não confiar em X-Forwarded-For arbitrário. Os números são parâmetros técnicos propostos, não decisões de negócio de Taís.

## Persistência e recuperação

Migração aditiva, sem recriar equipe ou preencher senha padrão. Usuário de aplicação sem DDL, migrador separado e `synchronize:false` preservados. Login verifica hash fora do lock, depois relê versão/situação na transação antes de emitir sessão. Reset/transações revalidam admin, alvo e revisão; senha antiga não pode ganhar sessão após reset concorrente. Revogação/desativação toma precedência na próxima validação; requisições já em andamento preservam revalidações transacionais existentes.

Bootstrap por comando local interativo, sem senha em argumentos/env/logs: cria primeiro admin apenas se equipe vazia, sob lock B03. Recuperação técnica recebe ID explícito do único admin ativo, nunca escolhe outro automaticamente, emite temporária e audita; recusa alvo inativo. Provisionamento de conta legada sem credencial por admin (ou recuperação técnica do único admin), com e-mail único explícito, sem mudar identidade. Não há endpoint de bootstrap ou recovery técnico.

## Limites

Google Cloud faturamento não bloqueia este incremento. Não instalar bibliotecas, executar migrações ou validar segredos neste planejamento. Pesquisa não altera decisões de domínio. Browser completo depende de B19; desempenho criptográfico e regressões serão medidos na implementação.
