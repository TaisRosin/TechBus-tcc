# Plano

Estender return_locations com campos de catálogo e vínculo direto ao grupo, preservando IDs e referências históricas. Catálogo dropoff expõe apenas registros criados pela equipe. Resolver disponibilidade em helper compartilhado; locais legados conservam representação antiga e não aparecem no seletor de novos padrões. Backend valida novo padrão por locationId. Não instalar mapas nem aceitar comprovação geográfica do cliente. Migração local versionada, sem synchronize. UI reutiliza formulários e seleciona IDs.

Testes de domínio e PostgreSQL primeiro; verificar API, jornada, planejamento e itinerários; tipos/lint/build backend e navegador frontend. Não iniciar integração WhatsApp real.
