# Painel local TechBus

**Estado em 17/11/2026:** consulte o [guia de apresentação e andamento](../docs/guia-apresentacao-andamento.md). Pontos fixos, contexto, agendador e prévia Google Maps já estão implementados; a cadeia real completa de WhatsApp e a hospedagem permanecem pendentes. O ensaio de 09/11 registrou aceite de quatro consultas pelo provedor, sem comprovar entrega e respostas aplicadas.

Atualização 11/11/2026: Itinerários reúne Ida, Volta e Intermunicipal; Planejamento não tem página separada. Escolha veículos/motoristas nas abas, salve todas as escolhas e confirme a operação após o fechamento. Grupos locais têm prévia e edição da ordem padrão expansível. Frota usa dias disponíveis e exceção por data, sem horários. Reconfigure as disponibilidades antigas após aplicar as migrações diárias; nenhum intervalo foi promovido automaticamente a dia disponível.

Primeira interface conectada às APIs reais. React, Vite, Tailwind e componentes locais no padrão shadcn/ui. Dependências fixadas em package-lock.json; Node local do projeto. Sem dados de demonstração embutidos e sem token salvo em storage/cookie.

## Iniciar

Na raiz do projeto, em dois terminais PowerShell:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/painel-local.ps1 -Service api
```

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/painel-local.ps1 -Service front
```

Abrir http://127.0.0.1:5173. Usar conta individual já cadastrada; não há login padrão. Primeiro acesso exige nova senha. Se a credencial expirou, seguir [autenticação própria](../specs/017-autenticacao-propria/quickstart.md). Não criar ou recuperar usuário silenciosamente. Ctrl+C encerra cada servidor; PostgreSQL pode continuar disponível para o projeto.

O launcher de API usa o banco dev existente e desativa Evolution, processamento, envio e Gemini apenas nesse processo, sem editar .env. Cadastro/correção na interface grava dados reais de dev. O banco deve ter as migrações B18 aplicadas. Não iniciar junto de outro backend na porta 3000; o launcher não mata processos. Este modo permite testar o painel sem disparar WhatsApp. O ensaio com canal real é uma etapa separada e ainda pendente.

Se o login indicar serviço indisponível, confira `http://127.0.0.1:3000/health/ready`: a API pode estar aberta mesmo sem conexão com o banco. Consulte `scripts/local-postgres.ps1 -Action status -Environment dev` e o log local `.local/postgres/dev-server.log`. Uma porta ocupada com cluster indisponível exige identificar o processo; não apagar dados, reinicializar o cluster ou encerrar processos PostgreSQL indiscriminadamente.

## Fluxo inicial

1. Configurar calendário de Unimater/Unidep.
2. Criar grupos de ida/volta e pontos fixos de embarque/desembarque; cadastrar alunos com vigência. Regiões e referências legadas permanecem preservadas.
3. Definir pontos habituais cadastrados e ativos. Endereço estruturado não comprova existência real; a conferência no mapa é explícita e vale para a prévia.
4. Consultar operação, revisar pendências e registrar correção explícita com justificativa.
5. Cadastrar veículos/motoristas e disponibilidade; preparar rascunho e consultar recomendação intermunicipal.
6. Confirmar planejamento somente após fechamento e pendências resolvidas; ordenar e publicar itinerário manual.

O agendador/fechamento automático está implementado, mas desativado pelo launcher seguro do painel, assim como as integrações de mensagens. Maps tem configuração própria descrita abaixo; não valida automaticamente a área atendida. A cadeia real completa da noite permanece pendente. Não há simulação de sucesso nem liberação de bloqueios pela interface. Motorista consulta somente suas atribuições confirmadas, com vínculo de conta administrado pelo admin. Novo acesso permite criar conta e vincular motorista; gestão/recuperação de contas já existentes ainda usa backend/CLI.

## Verificação

Em frontend, com Node/npm locais no PATH: `npm run typecheck`, `npm run build`, `npm test` (Edge instalado, headless). Testes de navegador usam APIs substitutas em porta 5174. `node scripts/real-smoke.cjs` usa PostgreSQL **test**, backend real e Vite em porta 5176, dados sintéticos exclusivos e limpeza apenas desses registros; requer backend compilado e banco test iniciado. Nunca aponta para dev nem envia WhatsApp. Não executar em paralelo com outras suítes que alterem o mesmo banco test.

Instalação limpa: `npm ci` em frontend. `TECHBUS_API_URL` pode alterar o destino do proxy local; nunca é segredo do cliente. Preview: `npm run preview`, em 127.0.0.1:4173. Hospedagem final ainda não configurada.

## Mapa e rotas

No menu Mapa e rotas, escolha um grupo e os pontos cadastrados ou confirmados hoje. Defina posições pendentes em Itinerários. A origem é o primeiro ponto e o destino é o último da ordem do grupo, mesmo sem passageiros nesses extremos. No modo do dia, os intermediários são filtrados pelos passageiros confirmados. Busque cada endereço, selecione o candidato e confira o marcador no mapa. Após marcar a conferência, Calcular percurso mostra o caminho, distância e duração estimada. Trecho direto / intermunicipal aceita origem e destino informados manualmente.

As escolhas geográficas duram apenas nesta sessão da tela. A ordem é lida e revalidada no backend. Arquivos privados: backend/.env com GOOGLE_MAPS_API_KEY e frontend/.env com VITE_GOOGLE_MAPS_API_KEY. Reinicie os processos após alterar a configuração. Requer Geocoding e Routes no servidor, Maps JavaScript no navegador. A chave web deve permitir a origem local usada, incluindo porta 5173.

Evidências e limites em [verificação Maps](../specs/026-mapas-rotas/verification.md).
