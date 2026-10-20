# Elysium Crossing

Port para navegador de Animal Crossing GameCube, com integração Deluxe,
autenticação, persistência e recursos multiplayer próprios.

Esta é a **exportação pública sanitizada de 19/10/2026, rodada 20**: código
próprio revisado e documentação. A fonte privada de referência é
`dfac0208f86f51288d5981acdd854a4547b376bb`, branch `integrada-1019`, com
Native79 / Web100 / backend54. A composição Deluxe é a base de desenvolvimento
desde 17/10. O pacote candidato está instalado em ambiente de teste; nesta
fotografia, a produção continua na rodada 19. A publicação destas fontes não
implanta o jogo.

O recorte contém 32 arquivos de fontes próprias, contratos e testes. Não executa
o jogo sozinho e não é um backup da composição privada. Native/decomp, recursos
licenciados e dados dos jogadores ficam fora. Consulte o [escopo](docs/public-source-scope.md),
a [retomada atual](docs/continuation.md) e o [marco de integração](docs/milestones/2026-10-19-integracao.md).

## Estado atual

A rodada 20 integra telemetria e logs estruturados; correções de reconciliação
de progresso na entrada; escolha entre criar uma vila e morar com um amigo;
revisão de nomes dos vizinhos; escolha do trabalho inicial do Nook; sons de
menus autenticados; e ações Ajudar/Visitar na ficha de amigos. Essas funções
existem na composição privada; este recorte publica somente módulos próprios
selecionados, sem sons, textos extraídos ou UI dependente de assets.

O snapshot público atualiza contratos de inventário, armazenamento, portarias,
retratos, competição e interação; clientes de mundo/recursos; preferências de
som e gráficos; e 12 receitas declarativas com materiais. As quantidades
referenciam fontes por receita. Código e contratos não comprovam, por si,
que todos esses caminhos passaram por QA no jogo.

Permanecem pendentes os fluxos completos de aceitar o trabalho do Nook,
chegar como morador de um amigo, Visitar/Ajudar com embarque real no Porter,
conferência de todos os sons e iPhone físico. A auditoria de desempenho,
áudio, relógio e concorrência com quatro jogadores está em andamento; esta
publicação não declara esses testes aprovados.

## Verificar o recorte público

Requer Node 24 e as dependências declaradas no lockfile:

```sh
npm ci --ignore-scripts
npm run typecheck
npm test
npm run verify:export
```

São 57 testes locais/controlados: 43 de pesca/continuidade, 12 de haptics e
2 de relógio, sem Native ou deploy. O manifesto fixa origem, tamanho, SHA-256
e modos Git. Índice e árvore do commit também são verificados antes do push.
Leia os [limites da verificação](docs/verification.md).

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
