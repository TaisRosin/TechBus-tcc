# Dados B16
- group_stop_orders: group_id uuid PK/FK local_groups; version integer >0; stop_ids uuid[] NOT NULL, cardinalidade <=1000, sem nulos, IDs únicos. Ordem do array define posição; validade/pertencimento/atividade sob lock de locais. Coleta referencia pontos; distribuição referencia endereços de retorno B06.
- published_itineraries: PK(date,group_id), FK grupo e operation_plans(date); version, plan_version e order_version integer >0; stop_ids uuid[] com mesmas restrições; source_token text com exatamente 64 caracteres hexadecimais; published_by FK team_users; published_at timestamptz. Guarda última publicação explícita, sem histórico consultável.
- Prévia/token e listas são projeções. Token considera data, grupo/sentido, ordem/revisão, demanda e plano; não aceita confirmação com prévia obsoleta. Publicação incompleta rejeitada atomicamente.
- App SELECT/INSERT/UPDATE, sem DELETE/DDL. Reversão recusa registros de qualquer tabela. Migração somente local dev/test.
