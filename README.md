# Elysium Crossing

Modernização incremental de Animal Crossing de GameCube para navegador, com
interface mobile, controles touch, multiplayer e persistência no servidor.
A personalidade e os sistemas do jogo original orientam a experiência;
New Horizons serve de referência funcional para as extensões.

Este repositório publica código próprio revisado e documentação do progresso.
O recorte contém contratos da aplicação, aplicação de estado compartilhado no
cliente, infraestrutura de checkpoint, relógio do servidor, feedback háptico e
o carregador de assets privados. Não contém o jogo executável nem todos os
módulos do workspace privado de integração. O
[mapa do código](docs/public-source-scope.md) explicita o que está disponível e
o que ainda precisa de revisão para publicação.

## Estado em 14/10/2026

O incremento de interfaces acrescenta ao contrato o orçamento de resolução
efetivamente aceito pelo runtime nativo em 1x, 2x ou 3x e a seleção de
ferramentas do bolso. O carregador publicado verifica tamanho e SHA-256 dos
arquivos, restringe as rotas aceitas e exige autorização online antes de ler
inclusive o cache local. Ele não contém os arquivos do jogo que carrega.

A roda circular passou por verificação focal de interface em retrato, paisagem
e desktop. Os ícones existentes e o cursor usam recursos originais na integração
local; esses recursos, seus dados extraídos e os consumidores que dependem deles
não fazem parte desta exportação. Equipar e voltar a Mãos livres foram
verificados no Native, com conservação dos itens e consistência do checkpoint
persistido. A roda sem legendas também foi conferida dentro do jogo real em retrato,
paisagem e desktop, com nomes acessíveis preservados.
O [relatório do incremento](docs/milestones/2026-10-14-native-ui.md) separa as
fontes publicadas, as verificações focais e o aceite ainda aberto.

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
- [Relatório do incremento de interfaces nativas](docs/milestones/2026-10-14-native-ui.md)
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
controlado. O typecheck verifica também o grafo de contratos, WorldClient,
checkpoint e carregador privado. Não são uma simulação do jogo, uma prova do multiplayer completo
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
