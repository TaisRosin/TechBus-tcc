# Decisões técnicas B06
Sem nova escolha de versão/provedor; pins e lockfile anteriores preservados. Sem geometria/mapas escolhidos por suposição.
Porta de endereço retorna dentro/fora/indeterminado; caso dentro exige provider, key canônica, label, regionId e evidence não vazios. Runtime usa indisponibilidade explícita. Tests substituem só a porta; nenhum validador permissivo no runtime.
Ponto tem grupo de coleta único; região tem distribuição única. FK composta com direction fixa na tabela filha reforça regra no PostgreSQL; índices nas referências. Dias/rotas/frota não são duplicados.
Padrão por aluno/sentido, revisão própria, origem initial/request/consent e referência textual. initial apenas primeiro preenchimento; alterações exigem request/consent. Não pretende registrar conversa real nem implementar jornada/sugestão B10.
Lock transacional compartilhado por todas as operações B06 evita corrida de desativação e escolha, sem novas bibliotecas. Reutilizar decisões PostgreSQL de [B04](../003-cadastros-vigencias/research.md). Não manter transação aberta durante futura chamada de mapas. Chave externa de identidade evita fundir grafias sem evidência.
