# Paridade funcional

Matriz inicial revisada para o relatório de 13/10/2026. O estado é da integração
local, não uma indicação de que todas as fontes já estejam nesta exportação.
“Ausente” e “Não investigado” referem-se aos caminhos auditados.

| Sistema | GameCube aproveitado | Referência NH | Elysium / evidência | Próximo aceite |
| --- | --- | --- | --- | --- |
| Inventário e organização P0 | Slots, equipamento, ações e overlays | Organização, quantidade e regras por tipo | **Parcial**: drag, seleção múltipla, menus e coleções adaptados; sem pilhas genéricas | Transferências e pilhas conservam quantidade; estado consistente após reentrada |
| Decoração exterior P0 | Geometria, perfil e colisão de móvel original | Mobiliário montado no exterior | **Parcial / Observado**: um barril, prévia/cancelamento, colocação/recolha e duas perspectivas | Concorrência de ocupação, paridade PAD e regressão interior |
| Persistência de objetos P0 | Save, terreno e inventário originais | Decoração persistente | **Parcial / Observado**: identidade/dono/revisão, transação e preservação após reinício no slice exterior | Completar os critérios de conflito e regressão do mesmo candidato |
| Roda de ferramentas P1 | Equipar e desequipar existentes | Seleção rápida | **Ausente** como roda moderna | Touch e controle chamam equipar existente; cancelar e alternar sem input preso |
| Crafting P1 | IDs, itens, economia e obtenção originais | Receita, materiais e produção | **Ausente** como sistema integrado | Receita mínima, desbloqueio e consumo/resultado canônicos |
| Reações P1 | Animações e avatares remotos | Interação social por reações | **Parcial**: seis reações e duração limitada no sistema atual | Expandir cancelamento/interrupção e conferir pares |
| Personalização P2 | Variações e estados de móveis originais | Cores e padrões | **Não investigado** como extensão integrada | Uma variação com posse e estado preservados |
| Jardinagem P2 | Calendário, crescimento, árvores e flores | Plantio, crescimento e cruzamentos | **Parcial**: base de plantio/crescimento sob servidor; não jardinagem completa | Regras explícitas e resultado consistente entre participantes |
| Metas e recompensas P2 | Eventos e economia existentes | Progressão por realizações | **Parcial**: eventos/recibos/feed; sem catálogo moderno de metas | Progresso individual por fatos confirmados e concessão única |
| Rotinas NPC P2 | Agendas, eventos, movimento e diálogos | Variedade de rotinas/interações | **Não investigado** para expansão | Separar estado global/individual e ampliar uma rotina existente |
| Infraestrutura P3 | Estruturas e colisões existentes | Pontes, rampas e posicionamento | **Não investigado** como edição persistente | Incremento pequeno após auditoria de ocupação e terreno |
| Terraformação P3 | Tiles, altura/água, meshes e colisões | Ferramentas de terreno | **Não investigado** para edição integrada | Estudo e POC de célula com visual, colisão, pares, persistência e recuperação |
| Construção avançada P3 | Arrumação interior adaptada | Edição interior/exterior | **Parcial**: interior touch e primeiro móvel exterior | Consolidar ações existentes antes de editor amplo |

## Grau de evidência

- **Confirmado:** código ou dado verificável da revisão consultada.
- **Documentado:** fonte técnica primária ou documentação oficial.
- **Observado:** comportamento reproduzido no jogo e vinculado a candidato.
- **Hipótese:** interpretação ou solução proposta ainda não demonstrada.

As referências funcionais NH não certificam sua implementação interna. Não
copiamos offsets de NH para o save GameCube nem inferimos regras de pilha,
genética ou rede pela existência de nomes semelhantes. O
[catálogo de pesquisa](research/reference-catalog.md) conserva as limitações.
