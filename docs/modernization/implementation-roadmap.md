# Roadmap de implementação

Escopo: [plano ativo](plan-v1.md). Revisão pública de 13/10/2026.
O estado abaixo descreve resultados verificáveis e pendências; não depende
de um servidor estar aberto no momento em que a documentação é consultada.

| Marco / tickets | Resultado | Estado atual | Próximo passo |
| --- | --- | --- | --- |
| 0 / MOD-000–001 | Auditoria, paridade, riscos e proveniência | Auditoria inicial entregue; ancestral exato ac-decomp e CI ainda não confirmados | Manter docs alinhados às fontes/candidatos; revisar a procedência da integração para publicar código adicional |
| 1 / MOD-010–013 | Um móvel exterior sincronizado e persistido | Slice observado: prévia, cancelamento, modelo/collider, colocar/recolher/repor, dois clientes, retorno e restart/reabertura | Concorrência de ocupação, paridade controle e regressão interior antes de encerrar marco |
| 2 / MOD-020–022 | Inventário, regras de quantidade e atalhos | Menus touch adaptados; pilhas e roda modernas pendentes | Regras por tipo e estado individual, transferência atômica e equipar existente |
| 3 / MOD-030–031 | Crafting funcional | Pendente | Uma receita orientada a dados, desbloqueio, materiais e resultado canônicos |
| 4 / MOD-040 | Expansão social | Base de seis reações existe; marco pendente | Animação, replicação, cancelamento e interrupção usando infraestrutura atual |
| 5 / MOD-050–051 | Jardinagem, progressão e pequenas variações | Bases de plantio/crescimento/eventos existem; expansão pendente | Primeira regra persistente e meta/recompensa por fato real; auditar NPCs |
| 6 / MOD-060–062 | Terreno e infraestrutura | Estudo/POC pendentes | Traçar altura/água/mesh/colisão/nav; alterar uma célula isolada ou justificar alternativa |

## Pendências do port original

Continuam ativos a validação de captura de peixe no candidato corrente,
conflitos ordinários de recursos, gráficos/performance e os refinamentos de
touch pedidos pelo usuário. Preservar movimento contínuo de câmera, controles
contextuais, autosave e isolamento entre villas durante a modernização.

O refinamento atual cobre bolso/peixes/insetos, caixa de correio, mapa, avisos,
popups de ações, zoom/luz interior e interação direta com alvos do mundo.
No candidato `0c66814ef9b3191f556d`, a escrita e leitura de aviso por touch e
a contenção do popup do bolso em retrato/paisagem/desktop foram observadas.
O toque na placa distante e outras regressões ainda não encerraram o incremento.
Uma correção de glyph de data permanece em fonte, sem nova execução renderizada.

## Ordem de execução

1. Fechar o incremento de interfaces em andamento sem perder as provas verdes.
2. Encerrar critérios restantes do primeiro móvel exterior no mesmo conjunto
   de artefatos, mantendo os testes do port anterior distintos.
3. Avançar inventário/atalhos e depois crafting em fluxos completos.
4. Ampliar social, jardinagem/progressão e estudo de terreno incrementalmente.
5. Publicar marcos grandes verificados com fontes de origem revisada,
   documentação e limites conhecidos. Não publicar inputs proprietários.

Somente WhatsApp fica fora desta meta. O projeto ainda não está concluído.
