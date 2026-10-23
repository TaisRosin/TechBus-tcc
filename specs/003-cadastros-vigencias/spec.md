# B04 — Cadastros e vigências

**Created**: 2026-10-23 | **Status**: Aprovada para implementação após respostas de Taís.
**Feature directory**: `specs/003-cadastros-vigencias`
**Input**: Continuar B04 aproveitando R01/R02 e confirmar as duas recomendações.

## User Scenarios & Testing

### US1 — Cadastrar e manter alunos (P1)
Admin/operador consulta Unimater/Unidep e cadastra aluno com nome, telefone, universidade, dias habituais e primeira vigência. Prioridade: base dos próximos incrementos.
**Teste independente**: cadastrar, consultar e corrigir aluno; motorista não acessa cadastro.
1. Cadastro válido persiste aluno e primeira vigência juntos; falha não deixa cadastro parcial.
2. Telefone equivalente já cadastrado é rejeitado, inclusive em concorrência ou aluno inativo.
3. Zero dias habituais é permitido para uso somente extra; não gera consulta automática habitual.
4. Edição com revisão antiga é rejeitada sem sobrescrever a mais recente.

### US2 — Manter e renovar vigências (P1)
Admin/operador consulta, adiciona e corrige períodos sem dados financeiros. Prioridade: impedir confirmações sem vínculo válido.
**Teste independente**: renovar com período posterior, rejeitar inversão e sobreposição.
1. Início e fim são inclusivos; datas inválidas/invertidas são rejeitadas.
2. Períodos do mesmo aluno não se sobrepõem, inclusive duas requisições concorrentes.
3. Períodos de alunos diferentes podem coincidir; renovação não apaga anteriores.

### US3 — Disponibilizar bloqueios de cadastro/vigência (P2)
Disponibilizar verificação interna da base cadastral para os próximos fluxos, sem confundir com elegibilidade completa.
**Teste independente**: relógio controlado confirma limites inclusivos e aluno inativo bloqueado.
1. Desconhecido, inativo ou sem vigência atual não passa pela verificação cadastral.
2. Desativar preserva cadastro, vigências e confirmações existentes; ajuste destas é manual pela equipe.
3. Zero dias habituais não impede a base cadastral para pedido extra; operação da universidade e prazo ainda serão avaliados nos incrementos próprios.

### Edge Cases
Virada do dia em America/Sao_Paulo; ano bissexto; períodos encostando no mesmo dia; atualização concorrente; telefone formatado; campos financeiros/inesperados; indisponibilidade do banco; perda de permissão durante comando.

## Requirements
- **FR-001**: Apenas admin/operador gerencia cadastro e vigências, reutilizando autorização B03.
- **FR-002**: Telefone normalizado único identifica aluno, sem autocadastro nem verificação real do WhatsApp.
- **FR-003**: Nome, universidade, dias habituais (inclusive vazio), estado ativo e revisão são mantidos.
- **FR-004**: Primeira vigência é atômica com cadastro; renovar/editar preserva períodos e impede sobreposição inclusive concorrente.
- **FR-005**: Vigência inclui início/fim e usa data operacional America/Sao_Paulo.
- **FR-006**: Inatividade bloqueia novas consultas/confirmações nos consumidores futuros, sem cancelamento automático de confirmações existentes.
- **FR-007**: Não excluir automaticamente dados nem enviar notificações durante alterações manuais.
- **FR-008**: Catálogo restringe-se a Unimater/Unidep; locais padrão ficam em B06 e calendário/elegibilidade completa em B05.

### Key Entities
Universidade: catálogo aprovado. Aluno: identidade cadastral, universidade, dias habituais, estado e revisão. Vigência: aluno, intervalo inclusivo e revisão; sem financeiro.

## Success Criteria
- **SC-001**: Todos os cenários de aceitação verificados por testes automatizados locais.
- **SC-002**: Escritas concorrentes não produzem telefone duplicado nem períodos sobrepostos.
- **SC-003**: Falhas não deixam cadastro parcial nem sobrescrevem revisão recente.
- **SC-004**: Nenhum serviço real ou dado de produção é necessário para verificar B04.

## Assumptions e decisões confirmadas
Taís aprovou em 23/10/2026 as duas recomendações: inatividade sem cancelamento automático e zero dias habituais para extras. A resposta autoriza implementação completa conforme fluxo acordado. Cadastro de locais será completado em B06; B04 não declara R01 integralmente entregue.
Fontes normativas: [requisitos R01/R02](../../docs/requisitos.md), [backlog B04–B06](../../docs/backlog.md), [decisões](../../docs/decisoes.md), [constituição](../../.specify/memory/constitution.md). Sem novas dúvidas de negócio bloqueantes.
