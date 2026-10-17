> Registro de planejamento anterior. A base vigente e a ordem de retomada estão
> em [continuation.md](../continuation.md), atualizado em 17/10/2026.

# Paridade funcional

Revisão pública de 14/10/2026. Os estados descrevem a integração local; não
significam que o runtime completo esteja publicado. **Confirmado** exige código
ou dado verificável; **Documentado**, fonte confiável; **Observado**, reprodução
no jogo; **Hipótese**, interpretação ainda não demonstrada.

| Sistema | GameCube reutilizado / referência NH | Elysium e evidência | Próximo aceite |
| --- | --- | --- | --- |
| Inventário e organização P0 | Slots, condições, menus / organização e quantidades | **Parcial**: touch, drag, seleção múltipla e codec de pilhas de fruta; materiais em Source isolado | Compor materiais, conservar transferências e corrigir editor |
| Decoração exterior P0 | Geometria e colisão / móveis no exterior | **Parcial, Observado**: colocar/recolher/repor e duas perspectivas; usuário relata recolha pouco clara | Distinguir móvel/item/visitante e fechar affordance e regressões |
| Persistência de objetos P0 | Save/terreno / estado durável compartilhado | **Parcial, Observado**: decisão canônica, dono/revisão, restart e retorno em slices delimitados | Concorrência, reconexão e recorte final consistente |
| Roda de ferramentas P1 | Equipar existente / seleção rápida | **Parcial, Observado**: roda circular aceita, equipar/guardar e três proporções | Fundo do botão, continuidade e ações remotas |
| Crafting P1 | Economia/itens / materiais e receitas | **Parcial**: protótipo de autoridade; receita com maçãs rejeitada ainda no pacote; madeira/ferro em Source | Integrar obtenção, consumo e resultado; novo alvo do caderno |
| Reações P1 | Animações/ghosts / interação social | **Parcial**: seis reações e provas focais/visita | Cancelamento/interrupção e apresentação remota sem piscadas |
| Personalização P2 | Variações originais / aparência e estados | **Parcial em frentes isoladas**, sem novo fluxo integrado aceito | Uma variação funcional e persistida |
| Jardinagem P2 | Calendário/crescimento / plantio e cruzamentos | **Parcial**: plantio/crescimento sob servidor; evolução isolada | Regra persistente, resultado compartilhado e cruzamentos |
| Metas e recompensas P2 | Eventos/economia / realizações | **Parcial**: eventos/recibos e provas focais | Progresso persistente e concessão única em fluxo real |
| Rotinas NPC P2 | Agendas/diálogos / variedade de rotinas | **Não investigado** para expansão concluída | Separar estado global/individual e ampliar rotina existente |
| Infraestrutura P3 | Estruturas/colisão / pontes e rampas | **Não investigado** para editor integrado | Auditar ocupação e terreno |
| Terraformação P3 | Acres/altura/água / edição de terreno | **Parcial, estudo e POC isolada**; sem terraforming integrado | Visual, colisão, navegação, persistência e recuperação juntos |
| Construção avançada P3 | Interior adaptado / edição interior/exterior | **Parcial**: interior touch e primeiro móvel exterior | Consolidar controles e permissões antes de ampliar editor |

Câmera contínua e cache visual não eliminam por si só setores, lifecycle de
atores ou colisões. POCs e focais não equivalem a integração. As referências NH
orientam comportamento, sem importar offsets ou assets. O
[catálogo de pesquisa](research/reference-catalog.md) conserva as limitações.
