# Ferramentas operacionais locais

Estes dois scripts próprios foram publicados byte a byte das unidades revisadas
em 14/10/2026. Não incluem o backend, o jogo, credenciais, dados ou recursos
privados. Requerem Node.js 24 e os inputs correspondentes da integração local.
Não são um comando para iniciar o jogo a partir deste clone.

## Snapshot e restauração

`store-snapshot.mjs` recebe explicitamente um store e o backend fechado que
conhece seu formato. Reutiliza `server/passport.ts`, `server/gci.ts` e
`shared/contracts.ts` desse backend; esses leitores não estão nesta árvore.
Use o `tsx` instalado no ambiente de operação para imports TypeScript.

```sh
node --import tsx tools/release/store-snapshot.mjs snapshot --source /privado/store --destination /privado/backup-novo --backend /privado/backend-fechado
node --import tsx tools/release/store-snapshot.mjs verify --source /privado/backup-novo --backend /privado/backend-fechado
node --import tsx tools/release/store-snapshot.mjs restore --source /privado/backup-novo --destination /privado/restore-novo --backend /privado/backend-fechado
```

Os caminhos são exemplos; devem ser absolutos, canônicos e locais. O pai do
destino deve existir, e o destino deve ser novo e não se sobrepor à origem.
A ferramenta usa backup SQLite com origem somente leitura, copia os blobs
imutáveis referenciados no corte, verifica tamanho/hash e usa leitores reais.
Não copia WAL/SHM bruto nem usa hardlinks. Recusa sobrescrever ou converter
esquema. Grava o marcador de conclusão por último; uma falha preserva a origem
e o destino parcial. Não inicie serviço sobre um backup incompleto.

O resultado real local preservou 23 tabelas e 7.064 blobs. Isso comprova dados,
não jogabilidade sobre o restore. Dados gerados, `snapshot.json`, saves e DB
continuam privados; nunca os adicione ao repositório ou ao relatório público.

## Preparação de release

```sh
node tools/release/prepare.mjs /privado/config-release.json /privado/preparacao-nova
```

O JSON exige `origin`, `tunnelId`, `credentialsFile`, `runtimeRoot`,
`nodeBinary`, `dependenciesDir`, `cloudflaredBinary`, `backendDir`, `webDir`,
`gameDir`, `modsDir`, `presentationDir`, `discPath`, `motherMailAssetsDir`,
`itemIconsDir`, `uiFontDir`, `uiHandDir`, `packageHandoff` e, opcionalmente, `port`.
Os inputs devem apontar para um pacote fechado autorizado e ferramentas já
instaladas. O script valida o pacote e usa os leitores existentes dos providers
privados. Os pins identificam o conjunto local admitido; não são os assets.

A saída contém configuração e plists locais. A ferramenta não autentica, cria
um túnel, inicia processo, carrega LaunchAgent, envia dados ou implanta o jogo.
Configurações geradas, caminhos do host, certificados, credenciais e providers
permanecem privados. Usar o preparador não constitui autorização de deploy.

## Alcance das verificações

Os dois scripts passaram em `node --check`. As suites privadas anteriores
(8 casos de snapshot e 11 de configuração) exigem backend/providers/fixtures e
não foram copiadas nem substituídas por stubs neste clone. A inspeção local do
pacote real conferiu 73 artefatos e 29 arquivos de providers, sem iniciar serviço.
