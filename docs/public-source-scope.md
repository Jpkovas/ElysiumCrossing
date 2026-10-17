# Escopo público — Deluxe principal, 17/10/2026

Esta exportação contém 28 fontes próprias e seus contratos/testes, além de ferramentas
operacionais próprias já publicadas e documentação sanitizada. O manifesto registra
origem, modo Git, tamanho e SHA256 por arquivo. As fontes são cópias byte a byte da
base canônica promovida; não foram criados stubs de gameplay para fechar o recorte.

## Fontes

| Família | Conteúdo |
|---|---|
| Contratos compartilhados | Mundo, pesca, Native/API, checkpoint, residência, social, ranking e transporte de retrato |
| Crafting/materiais | Três receitas declarativas, folhas, quantidades e consumo de pilhas; remove o protótipo de maçãs |
| Clientes próprios | WorldClient, FishingClient, checkpoint/journal, recursos privados e texturas HD |
| Preferências | Opções gráficas, linhas de opções, relógio monotônico e haptics |
| Testes públicos |43 casos de pesca/continuidade, 12 de haptics e 2 de relógio |
| Ferramentas | Verificação exata do export e ferramentas próprias de snapshot/preparação já revisadas |

O grafo de imports publicado fecha para typecheck. Tipos, IDs finitos, offsets,
codecs, hashes e rotas identificam interoperabilidade; não incorporam pixels,
modelos, textos extraídos, arquivos de save ou as credenciais que consomem.

Os clientes precisam da sala/autoridade e do consumidor Native concretos que não
estão nesta árvore. O helper operacional de release é histórico e não representa
um pacote Deluxe pronto para deploy. Não há comando `start` ou build do jogo no
recorte público. O launcher completo existe somente no workspace privado.

## Origem

Nenhum arquivo do checkout Native Slider/Deluxe foi copiado para a exportação.
As ferramentas usam dependências declaradas no lockfile; nada foi vendorizado.
As fontes próprias mantêm sua origem, sem inferir uma licença nova. Os termos das
dependências continuam sendo os dos respectivos autores. O manifesto não é uma
licença sobre os arquivos privados identificados por hash.

## Exclusões

- Native/decomp/port completo e deltas sem revisão individual.
- Dumps, ROMs, executáveis, modelos, texturas, áudio, fontes e textos extraídos,
  inclusive quando embutidos em código ou JSON.
- Providers, layouts extensos gerados, banco, saves, passports, NES, RAMs, logs,
  recibos e fixtures reais das partidas.
- Sessões, convites, dados pessoais, certificados, chaves e configuração privada.
- Capturas do jogo e da UI com recursos proprietários; evidências ficam locais.
- Dependências, builds e toda a composição executável.

`verify:export` confere inventário/bytes/modos e rejeita extras, symlinks, binários
e extensões privadas. Índice e árvore do commit são conferidos separadamente;
nenhum push passa com verificação falha. Isso complementa a revisão de origem,
conteúdo e licença. O SHA remoto é conferido após o envio.
