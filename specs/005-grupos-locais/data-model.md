# Dados B06
Schema app; UUID gerado no backend; FK RESTRICT; sem exclusão/seed operacional.

| Tabela | Campos principais |
|---|---|
| local_groups | id, name, direction pickup/dropoff imutável, active, version; unique(id,direction) |
| service_regions | id, name, group_id, direction fixa dropoff, active, version; FK composta grupo/sentido |
| boarding_points | id, name, address (referência da equipe), group_id, direction fixa pickup, active, version |
| return_locations | id, provider, external_key unique por provider, label, region_id, evidence; identidade validada imutável |
| student_place_defaults | student_id + direction PK; boarding_point_id ou return_location_id exclusivo conforme sentido, source, evidence, version |

Textos limitados, nomes 200, endereço/label/evidence 1000, identidade externa 200. Índices nas FKs e IDs para paginação. Padrões ausentes são permitidos em cadastros ainda incompletos B04 e apresentados como necessidade de ajuste, nunca preenchidos automaticamente. Aplicação SELECT/INSERT/UPDATE em grupos/regiões/pontos/padrões, SELECT/INSERT em locais de retorno; sem DELETE/DDL. Sem confirmação nem histórico operacional consultável.
