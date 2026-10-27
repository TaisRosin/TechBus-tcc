# Quickstart B15
Reutilizar [ambiente B02](../001-base-backend/quickstart.md) e bancos locais dev/test. Backend: npm run build; node node_modules/jest/bin/jest.js --runInBand --testPathPatterns consultation; npm run lint; node node_modules/typescript/bin/tsc --noEmit; suíte completa após build.
Cenários: conta sem vínculo/operador/driver alheio; vínculo concorrente/revogado; confirmação real B12; ida/volta com motoristas distintos; cancelamento e mudança de grupo durante revisão; meia-noite/fim exato; plano anterior sem fotografia; leitura não modifica jornada/plano/mensagens.
