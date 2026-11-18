# Endereços estruturados dos pontos

Autorizado por Taís em 11/11/2026 após a pesquisa em docs/preparacao-maps.md. Escopo: cadastro próprio de embarque/desembarque com logradouro/localização, número textual ou sem número, bairro, município, UF, país BR, CEP opcional e complemento; referência da parada separada. Nenhuma integração, coordenada fictícia, validação de endereço real ou otimização.

Preservar UUIDs, grupos, jornadas, ordem manual, versões e o texto legado. Endereço formatado pelo backend continua atendendo consumidores existentes. Registros antigos podem continuar descritivos até edição explícita. Referência deve chegar à consulta do motorista e prévia do itinerário. Validação apenas estrutural.

- [x] Validação e formatação pelo backend, rejeitando campos de validação geográfica enviados pelo cliente.
- [x] Migração aditiva e persistência dos dados próprios, preservando endereço legado e referências.
- [x] Formulário de endereço e referência nos dois catálogos; edição legada segura.
- [x] Referência visível no itinerário e acesso do motorista.
- [x] Testes, tipos/lint/build, documentação e atualização do painel local já iniciado.

Interfaces de teste já usadas e autorizadas no projeto: parseCatalog (formatos), LocationService/consultas com PostgreSQL test (persistência/revisões/compatibilidade), navegador (cadastro e edição). TDD nas validações e preservação de registros; fornecedores externos não participam.
