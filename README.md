# Elysium Crossing

Port para navegador de Animal Crossing GameCube, com integração Deluxe,
autenticação, persistência e recursos multiplayer próprios.

Esta é a **exportação pública sanitizada de 27/10/2026**: o multiplayer
fantasma é a versão oficial desde 26/10, e esta rodada junta as frentes de
27/10 (eventos do Deluxe, K.K. e dívida, desempenho, tutoriais, telemetria e o
site novo) num candidato antes do Halloween. Cada conta joga o próprio save. Só uma lista
pequena de trechos da vila é compartilhada pelo servidor, e os outros jogadores
aparecem como fantasmas. A fonte privada e a origem de cada arquivo estão em
`public-export-manifest.json`. Produção e o ambiente publicado de teste não
mudaram com este envio; o envio destas fontes não implanta o jogo e não executa wipe.

O recorte contém 31 fontes próprias, contratos e testes. Ele não executa o jogo
sozinho e não é um backup da composição privada. Native/decomp, recursos
licenciados e dados dos jogadores ficam fora. Consulte o
[escopo](docs/public-source-scope.md), a [retomada](docs/continuation.md) e o
[marco atual](docs/milestones/2026-10-27-integracao.md), que segue a
[auditoria de 27/10](docs/milestones/2026-10-27-auditoria.md) e o
[marco de 26/10](docs/milestones/2026-10-26-fantasmas.md).

## O que mudou desde 19/10

- A linha oficial nasceu da base dos amigos (`dfac020`). A RC "Opção B" de 20 a
  24/10 ficou arquivada no workspace privado.
- Unidades da vila (`shared/town-units.ts`):
  - cada trecho compartilhado tem dono e regra de fusão;
  - a concorrência é decidida pela pré-condição da unidade, não por uma versão global.
- O canal World, a recuperação compartilhada e a pesca/plantio pelo servidor
  saíram. O ACK de checkpoint passou para `web/checkpoint-link.ts`.
- Conferidos no jogo:
  - moradores, visitas de trem e entrada por código com o K.K.;
  - loja, giroide, casa, chão, quadro, correio, museu e vizinhos compartilhados;
  - NES, troca de nomes e mudança pelo site;
  - pesca pelo toque e bricolagem.

**A publicação para os amigos não foi feita.** Ela depende de backup, wipe e
OK escrito do operador. iPhone físico e áudio percebido continuam pendentes.
Os [limites de verificação](docs/verification.md) separam teste e jornada.

## Verificar o recorte público

Requer Node 24 e as dependências declaradas no lockfile:

```sh
npm ci --ignore-scripts
npm run typecheck
npm test
npm run verify:export
```

São 14 testes locais/controlados: 12 de haptics e 2 de relógio. Eles não
executam Native nem deploy. O manifesto fixa origem, bytes,
SHA-256 e modos Git; índice e árvore do commit são verificados antes do push.

A base Native privada usa
[ACGC-Deluxe-PC-Port](https://github.com/imcynic/ACGC-Deluxe-PC-Port/tree/92b0a638ce9e686b3303b4d0ec985a1a99a7f962)
e a integração anterior de
[slider](https://github.com/turtlekiosk/slider/tree/cfecc8d4019c7182133b444a671d3b62b42bee44).
Nenhum arquivo desses checkouts Native foi copiado para esta árvore.
Licenças do código não concedem direitos sobre assets do jogo; não se atribuiu
por inferência uma licença nova ao código próprio.

Marcos anteriores permanecem em `docs/milestones/`, atribuídos às respectivas
builds. Dumps, assets, fontes, textos extraídos, áudio, saves, sessões,
credenciais, certificados, capturas e logs privados não são publicados aqui.
