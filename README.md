# Elysium Crossing

Modernização incremental de Animal Crossing de GameCube para navegador, com
controles touch, interface mobile, multiplayer e persistência no servidor.
New Horizons orienta as extensões funcionais; a identidade visual, atmosfera
e sistemas existentes do GameCube continuam sendo a base.

Este repositório contém **código próprio revisado e documentação do estado
atual**. Não contém dump, assets proprietários, saves ou um jogo executável.
A integração Native, o backend completo e parte da UI permanecem no workspace
privado. O [mapa das fontes](docs/public-source-scope.md) identifica cada limite.

## Estado em 15/10/2026

A candidata final local do primeiro lançamento é a **build H**: árvore
`294bcc8` com Native `9038499072698e635f5c`. Os módulos da aplicação publicados
aqui correspondem byte a byte a essa árvore. Isso não transforma o subconjunto
público em um build independente. [Marco da build H](docs/milestones/2026-10-15-build-h.md):
convite com passkey, telas do site e do jogo redesenhadas, dois jogadores e
queda do servidor com reconexão verificados no servidor de casa. O jogo não
está publicado; o domínio segue em manutenção até a aprovação do Jp.

A candidata anterior, `b75becf` com Native `452e50a30e467588df6e`, está no
[marco do lote C](docs/milestones/2026-10-15-lote-c.md).

O histórico abaixo descreve o estado de 14/10 (Native `fc29e6f82c26c626563d`,
Web `circular-ui-icons-only-20261014`):

- A roda circular sem legendas foi conferida no jogo em retrato, paisagem e
  desktop. Equipar e guardar a ferramenta preservaram os recursos canônicos.
- Visita por trem, encontro, movimento e chat bilateral, móvel visto por dois
  clientes, restrição de recolha pelo visitante, coleta de fruta e retorno à
  própria vila têm evidência local no candidato anterior `63b36dc74874f0244e99`.
  A suavidade de animação, itens segurados e ações remotas continuam pendentes.
- O bloqueio de gameplay durante desconexão do cliente e a retomada conservando
  recursos foram observados nesse candidato anterior. Queda do processo e
  acesso por Cloudflare ainda precisam de validação.
- Backup e restauração reais preservaram 23 tabelas e 7.064 blobs referenciados.
  Ainda falta jogar sobre o restore. As ferramentas operacionais próprias estão
  em [tools/release](tools/release/README.md); seus inputs privados não estão aqui.
- Madeira/ferro, regras de materiais, sombras e reparos recentes estão em
  incrementos isolados, ainda sem composição e aceite integrado.

**Limite do snapshot de crafting:** o código fechado ainda usa o protótipo
`fruit-barrel-v1` com três maçãs, rejeitado como receita final. A fonte aparece
nesta exportação para representar fielmente o contrato atual do cliente; não é
uma receita de New Horizons nem uma entrega aprovada. A substituição por madeira
e ferro está documentada como trabalho pendente de integração.

A primeira build para amigos via HTTPS tem prioridade. O plano completo de
modernização continua ativo em paralelo; somente WhatsApp fica para depois.
O teste físico de iPhone foi dispensado como requisito, sem substituir as
verificações de navegador, touch, proporções, persistência e multiplayer.

- [Build H, candidata final (15/10)](docs/milestones/2026-10-15-build-h.md)
- [Candidata do lote C (15/10)](docs/milestones/2026-10-15-lote-c.md)
- [Estado detalhado e pendências](docs/milestones/2026-10-14-current-state.md)
- [Handoff público para continuidade](docs/continuation.md)
- [Arquitetura e limites](docs/modernization/architecture-baseline.md)
- [Paridade funcional](docs/modernization/feature-parity.md)
- [Roadmap e sete critérios do primeiro lançamento](docs/modernization/implementation-roadmap.md)
- [Histórico do incremento exterior](docs/milestones/2026-10-13-exterior-slice.md)
- [Incremento da roda e interface nativa](docs/milestones/2026-10-14-native-ui.md)
- [Verificação desta exportação](docs/verification.md)

## Verificar o subconjunto público

Requer Node.js 24 ou posterior. Os pacotes de desenvolvimento são declarados
no lockfile; código de dependências não está vendorizado.

```sh
npm ci --ignore-scripts
npm run verify:export
npm run typecheck
npm test
node --check tools/release/store-snapshot.mjs
node --check tools/release/prepare.mjs
```

Uma instalação limpa, o typecheck, os 14 testes e os dois checks de sintaxe
passaram em Node 24.11.1. Os testes públicos cobrem relógio e haptics em ambiente
controlado. Não executam o jogo, a rede, os providers privados ou um deploy.

## Integração local e origem

A base nativa é
[turtlekiosk/slider no commit cfecc8d4019c7182133b444a671d3b62b42bee44](https://github.com/turtlekiosk/slider/tree/cfecc8d4019c7182133b444a671d3b62b42bee44).
Nenhum arquivo desse checkout foi copiado para esta árvore. A integração exige
alterações locais adicionais e inputs obtidos legitimamente. Não existe comando
`start` ou build completo neste recorte.

ROMs, dumps, saves, modelos, texturas, fontes, áudio, executáveis, certificados
e segredos permanecem privados. Links e identificadores de interoperabilidade
não incorporam os recursos correspondentes. Licenças de código aberto não
concedem direitos sobre assets do jogo. Não foi atribuída por inferência uma
licença nova ao código próprio; termos das dependências continuam sendo os dos
respectivos autores.
