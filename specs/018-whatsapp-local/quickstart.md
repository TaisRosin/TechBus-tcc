# Uso local B18.2

Atualização em 28/10/2026: instância `techbus-test` pareada por Taís, estado `open` verificado e receptor ativo. Não recriar a instância nem repetir a configuração inicial abaixo. Próximo ensaio: receber mensagem escrita de outro contato de testes; envio automático permanece desativado. Ver atualização em [evidências](verification.md).

Backend verificado com eventos sintéticos; Evolution responde localmente, sem instância conectada. [Evidências](verification.md). **TechBus utiliza Evolution API.** Preparação/controle do processo em [infraestrutura](../../infrastructure/evolution/README.md).

## Repetir verificações

Na raiz, iniciar os clusters TechBus dev/test com `scripts/local-postgres.ps1 -Action start -Environment dev` e `-Environment test`. Se a política do terminal bloquear scripts, executar com `powershell -NoProfile -ExecutionPolicy Bypass -File` somente para essa invocação. Em backend, com Node/npm locais carregados conforme [B02](../001-base-backend/quickstart.md): `npm test`, `npm run test:integration`, `npm run test:e2e`, `npm run lint`, `npm run build`. Testes de banco devem rodar sequencialmente. `tsc --noEmit` também verifica testes.

Evolution: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/local-evolution.ps1 -Action start`. Inicialização pode demorar: verificar HTTP, não apenas PID. Exemplo de leitura, sem imprimir segredos:

```powershell
$private = Get-Content .local/evolution-runtime/secrets.json -Raw | ConvertFrom-Json
$headers = @{ apikey=$private.api; Origin='http://127.0.0.1:8085' }
$instances = Invoke-RestMethod http://127.0.0.1:8085/instance/fetchInstances -Headers $headers
"Instancias: $(@($instances).Count)"
```

## Próxima sessão: preparar receptor e parear

Os passos abaixo ainda não foram executados. Usar somente o chip de testes, com o aparelho presente. WhatsApp Web vinculado anteriormente não equivale ao pareamento Evolution.

1. Acrescentar configuração ao ambiente **local ignorado** do backend, sem duplicar chaves existentes: `EVOLUTION_ENABLED=true`, `EVOLUTION_BASE_URL=http://127.0.0.1:8085`, `EVOLUTION_INSTANCE=techbus-test`, `EVOLUTION_API_KEY` recebe `api` do arquivo privado e `EVOLUTION_WEBHOOK_SECRET` recebe `webhook`. Manter `EVOLUTION_SEND_ENABLED=false`, `EVOLUTION_TEST_PHONES=`. Não colar segredos no chat ou em documentação.
2. Iniciar o backend dev na porta3000 com `.env` carregado, banco dev ativo e migrações aplicadas. Testar receptor antes de conectar o telefone.
3. Criar instância por `POST http://127.0.0.1:8085/instance/create` com os cabeçalhos privados acima e corpo JSON abaixo. Substituir o valor indicado lendo o arquivo privado, nunca por um segredo versionado. Guardar resposta apenas localmente; ela pode conter token/QR.

```json
{
  "instanceName": "techbus-test",
  "integration": "WHATSAPP-BAILEYS",
  "qrcode": false,
  "groupsIgnore": true,
  "alwaysOnline": false,
  "readMessages": false,
  "readStatus": false,
  "syncFullHistory": false,
  "webhook": {
    "enabled": true,
    "url": "http://127.0.0.1:3000/api/v1/integrations/whatsapp/webhook",
    "headers": { "X-TechBus-Webhook-Secret": "VALOR_PRIVADO_WEBHOOK" },
    "events": ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "CONNECTION_UPDATE"],
    "byEvents": false,
    "base64": false
  }
}
```

4. Solicitar QR via `GET /instance/connect/techbus-test`, exibi-lo somente localmente e ler em WhatsApp → aparelhos conectados. Consultar `GET /instance/connectionState/techbus-test`. Esses endpoints exigem os mesmos cabeçalhos; não enviar QR/token pelo chat.
5. Usar contato de teste e cadastro fictício com telefone exato E.164. Mensagem escrita recebida deverá aparecer na consulta administrativa do dia; sua repetição não duplica recibo. **B18.2 registra, mas ainda não interpreta nem confirma viagem.** Mídia recebe needs_text; LID sem PN e contato desconhecido ficam pendentes.
6. Somente depois de definir destinatário autorizado, preencher `EVOLUTION_TEST_PHONES` e habilitar envio para o ensaio controlado. Não ativar agendador. O adaptador B14 aceita apenas tentativas persistidas; não há endpoint de envio livre. Resultado unknown não deve ser reenviado cegamente.

Ao terminar, desligar Evolution com `-Action stop`, encerrar backend e parar somente os clusters iniciados para o ensaio. Não apagar sessão ou dados para resolver erros; preservar evidências. A prova real do pareamento/fluxo deverá ser acrescentada à verificação quando ocorrer.
