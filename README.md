# Elysium Crossing

Modernização incremental de Animal Crossing de GameCube para navegador, com
interface mobile, controles touch, multiplayer e persistência no servidor.
A personalidade e os sistemas do jogo original orientam a experiência;
New Horizons serve de referência funcional para as extensões.

Este repositório publica código próprio revisado e documentação do progresso.
A primeira exportação contém contratos da aplicação, aplicação de estado
compartilhado no cliente, infraestrutura de checkpoint, relógio do servidor e
feedback háptico. Não contém o jogo executável nem todos os módulos do workspace
privado de integração. O [mapa do código](docs/public-source-scope.md) explicita
o que está disponível e o que ainda precisa de revisão para publicação.

## Estado em 13/10/2026

O primeiro incremento de decoração exterior foi observado em dois clientes:
prévia, cancelamento, colocação de um barril, colisão, retirada, reposição,
visita, retorno à própria vila e preservação após reinício e reabertura.
O marco completo ainda tem critérios em aberto, incluindo concorrência de
ocupação, paridade com controle físico e regressão de interiores. Essas provas
locais pertencem ao candidato `6d79af919605cb14f133`; elas não tornam esta árvore
pública um jogo independente ou uma versão pronta para lançamento.

Os painéis touch continuam em refinamento. O plano ativo inclui inventário e
atalhos, crafting, interações sociais, jardinagem/progressão e estudo com prova
de conceito de terreno. A integração com WhatsApp fica para uma etapa posterior.

- [Arquitetura verificada e limites](docs/modernization/architecture-baseline.md)
- [Paridade GameCube × New Horizons × Elysium](docs/modernization/feature-parity.md)
- [Marcos e próximos critérios](docs/modernization/implementation-roadmap.md)
- [Relatório do incremento exterior](docs/milestones/2026-10-13-exterior-slice.md)
- [Origem dos arquivos e exclusões](docs/public-source-scope.md)

## Verificar este subconjunto

Requer Node.js 24 ou posterior. As dependências de desenvolvimento são
declaradas no `package.json`; seu código não está vendorizado.

```sh
npm ci
npm run verify:export
npm run typecheck
npm test
```

Os testes públicos executam o código de relógio e vibração com ambiente
controlado. O typecheck verifica também o grafo de contratos, WorldClient e
checkpoint. Não são uma simulação do jogo, uma prova do multiplayer completo
ou validação de vibração física no iPhone. O relatório de validação distingue
esses resultados das evidências de gameplay mantidas localmente.

## Integração local do jogo

A base nativa do workspace é
[turtlekiosk/slider no commit cfecc8d4019c7182133b444a671d3b62b42bee44](https://github.com/turtlekiosk/slider/tree/cfecc8d4019c7182133b444a671d3b62b42bee44).
O runtime exige a base nativa, as alterações próprias ainda em revisão de
publicação e inputs gerados localmente a partir de uma cópia legítima do jogo.
Este repositório não oferece esses inputs e não inclui um comando `start` ou
um build completo enquanto faltam fontes da integração.

ROMs, dumps, saves, modelos, texturas, áudio, executáveis, extrações do jogo,
certificados e segredos permanecem fora desta árvore. Referenciar uma licença
de código aberto não concede direitos sobre os assets do jogo. Não foi
atribuída por inferência uma nova licença ao código próprio do projeto;
declarações de dependências preservam os termos dos respectivos autores.
