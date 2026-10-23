# Dados B05
Schema app, migração explícita, synchronize=false.

| Tabela | Campos e invariantes |
|---|---|
| university_calendars | university_id text PK/FK universities; days smallint[] nullable, 0–6 domingo–sábado; version integer positivo |
| calendar_exceptions | university_id FK calendars + date date PK composta; operates boolean nullable; reason text 1–500 |

PK composta atende consulta por universidade/período. Arrays validados únicos no domínio, faixa/tamanho no banco. Datas 0001–9999 válidas. days=null não configurado; [] nenhuma operação semanal. operates=null herda semana sem apagar registro. Revisão do calendário aumenta em qualquer edição de semana/exceção. Aplicação SELECT/UPDATE em calendário, SELECT/INSERT/UPDATE em exceção, sem DELETE/DDL. Migração só cria duas linhas sem operação presumida; não altera alunos/vigências.
