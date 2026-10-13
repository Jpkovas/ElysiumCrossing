# Referências de pesquisa

Catálogo resumido da consulta primária de 12/10/2026. Estes links orientam
perguntas e comportamento; não incluem cópia de código, dados ou assets das
ferramentas. As revisões móveis de pesquisa ainda não têm SHAs confirmados.

| Fonte | Pergunta / uso | Versão e limite |
| --- | --- | --- |
| [ACreTeam/ac-decomp](https://github.com/ACreTeam/ac-decomp) | Sistemas e estruturas originais GameCube | README consultado identifica GAFE01_00; ancestral exato do checkout local não confirmado |
| [ACreTeam/forest](https://github.com/ACreTeam/forest) | Comparação de portabilidade | Referência complementar; não orienta troca automática de stack |
| [mckinlee/Animal-Crossing](https://github.com/mckinlee/Animal-Crossing) | Port nativo, SDL e camada gráfica | Licenças de decomp e plataforma precisam ser distinguidas por arquivo |
| [CylindricalEarth](https://github.com/Treeki/CylindricalEarth) | BCSV, save, EventFlow, colisão e dados de altura | GPL-3.0 na revisão consultada; pesquisa inclui executáveis antigos, como v1.1.4; nenhum código incorporado |
| [acnh-eventflow-decompiler](https://github.com/asteriation/acnh-eventflow-decompiler) | Condições e sequência de eventos | MIT na revisão consultada; exige informações compatíveis com versão; fluxo não é implementação integral da mecânica |
| [NHSE](https://github.com/kwsch/NHSE) | Relação entre item, estado, quantidade e mapa persistente | GPL-3.0 na revisão consultada; não transportar offsets para GameCube |
| [Norviah/animal-crossing](https://github.com/Norviah/animal-crossing) | Categorias e relações entre receitas/itens/reações | Código MIT não certifica automaticamente a licença das planilhas e recursos de origem; datasets não importados |
| [Nintendo — Create](https://animalcrossing.nintendo.com/new-horizons/create/) | Decoração, receitas e personalização | Comportamento documentado; não concede direitos sobre recursos do jogo |
| [Nintendo — Explore](https://animalcrossing.nintendo.com/new-horizons/explore/) | Exploração e expansão do mundo | Página funcional sem commit/versão de implementação |
| [Nintendo — histórico de versões](https://en-americas-support.nintendo.com/app/answers/detail/a_id/49112) | Qualidade de vida e correções por versão | Pesquisa registrou batch/armazenamento do crafting 3.0 como referência, não requisito imediato do slice mínimo |
| [Gaffer — Snapshot Interpolation](https://gafferongames.com/post/snapshot_interpolation/) | Suavidade e atraso de apresentação remota | Referência conceitual; não exige trocar transporte ou introduzir lockstep |
| [Unity — Authority](https://github.com/Unity-Technologies/com.unity.multiplayer.docs/blob/main/docs/terms-concepts/authority.md) | Autoridade e resolução de conflitos | Referência conceitual de repositório arquivado; o projeto não utiliza Unity |

Cada nova descoberta deve registrar funcionalidade, pergunta, fonte, versão,
grau de evidência, interpretação, adaptação e teste observável. Antes de
incorporar conteúdo, fixar revisão e licença concretas. Uma hipótese de
algoritmo ou dado encontrado em editor não constitui implementação confirmada.
