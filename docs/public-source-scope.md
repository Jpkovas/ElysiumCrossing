# Escopo público — multiplayer fantasma, 26/10/2026

São 31 fontes próprias e seus contratos/testes, além de ferramentas operacionais
próprias já publicadas e documentação sanitizada. O manifesto registra origem,
modo Git, tamanho e SHA-256 por arquivo. Cada fonte é cópia byte a byte da
candidata privada indicada em `privateCanonicalCommit` no manifesto.

| Família | Conteúdo |
| --- | --- |
| Contratos | Mundo, Native/API, checkpoint, residência, social, ranking, competição e retratos |
| Vila compartilhada | Unidades da vila (`shared/town-units.ts`): faixas do save e o tipo de fusão de cada uma |
| Crafting | Receitas com fontes, materiais e consumo de pilhas |
| Clientes | Checkpoint/journal, ACK de checkpoint (`checkpoint-link`), cache privado e texturas HD |
| Preferências | Gráficos, som, linhas de opções, relógio monotônico e haptics |
| Testes | 12 casos de haptics e 2 de relógio |
| Ferramentas | Verificação do export e helpers próprios de snapshot/preparação já revisados |

Saíram nesta exportação, porque saíram da fonte: `web/world-client.ts`,
`web/fishing-client.ts`, `shared/fishing.ts` e o teste de pesca.

O grafo de imports fecha para typecheck. O adaptador de som contém somente
código, IDs finitos e nomes de rotas autenticadas: nenhum áudio. Tipos, IDs,
offsets, codecs e rotas são contratos de interoperabilidade; não incluem pixels,
modelos, textos extraídos, saves ou credenciais. Dados declarativos de receitas
apontam suas fontes e não incorporam tabelas extraídas do disco.

## Origem e limites

Nenhum arquivo dos checkouts Native Slider/Deluxe foi copiado. As dependências
estão declaradas no lockfile, sem código vendorizado. Não se infere uma licença
nova para o código próprio, para o jogo ou para seus recursos. Os termos de
cada dependência continuam pertencendo aos respectivos autores.

A composição executável, servidor, sala e consumidor Native concretos ficam
fora do recorte. Os helpers de release são históricos e não montam esta
candidata. Não há comando `start` nem build do jogo nesta árvore.

## Exclusões

- Native/decomp/port completo e deltas sem revisão individual de origem.
- ROMs, dumps, executáveis, modelos, texturas, áudio, fontes e textos extraídos,
  mesmo quando embutidos em código ou JSON.
- Providers, layouts extensos gerados, bancos, saves, passports, RAM, logs,
  recibos, fixtures reais e capturas com recursos proprietários.
- Sessões, convites, dados pessoais, certificados, chaves e configuração privada.
- Dependências instaladas, builds e a composição executável.

`verify:export` exige inventário exato e bytes/modos declarados; rejeita extras,
symlinks, binários e extensões privadas. Índice e árvore são verificados à parte,
assim como origem e conteúdo. Falha de verificação interrompe o push.
O SHA remoto é conferido depois do envio.
