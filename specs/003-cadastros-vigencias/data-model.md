# Modelo físico B04
Schema app, synchronize:false, migração versionada.

| Tabela | Campos/restrições |
|---|---|
| universities | id text PK unimater/unidep, name text; catálogo fixo |
| students | id UUID PK, name text 1–200, phone text UNIQUE, university_id FK, habitual_days smallint[] 0–6 domingo–sábado, active boolean, version integer positivo |
| contracts | id UUID PK, student_id FK RESTRICT, start_date/end_date date início <= fim, version integer positivo; índice student_id/start_date/end_date |

Dias únicos/ordenados pela aplicação, vazio permitido. Aluno criado ativo com primeira vigência atomicamente. Renovação/edição bloqueiam aluno antes de consultar sobreposição inclusiva. Edição incrementa apenas revisão da entidade modificada. Sem exclusão, cascata, financeiro ou locais.
Aplicação: SELECT no catálogo; SELECT/INSERT/UPDATE nas demais. Migração usa usuário separado. Complementa [modelo geral](../../docs/modelo-dados.md); calendários/locais ficam B05/B06.
