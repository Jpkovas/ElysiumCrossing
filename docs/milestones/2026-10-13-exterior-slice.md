# Incremento de decoração exterior — 13/10/2026

**Estado: implementado e observado no cenário descrito; Marco 1 ainda parcial.**
O resultado local usa um móvel original, quatro rotações e uma célula de
ocupação. A prévia é local; posse, alcance, célula e consumo são decididos pelo
fluxo canônico existente. Não se criou um ator de quarto inteiro no exterior
nem um protocolo paralelo.

## Problema e comportamento

O jogo original permite largar itens no campo, mas isso não equivale a montar
mobiliário exterior persistente com identidade e dono. O novo fluxo deixa o
jogador selecionar um barril no bolso, escolher Posicionar, conferir a prévia,
cancelar ou confirmar, ver o móvel no campo e recolhê-lo quando autorizado.
Os participantes veem a mesma projeção da decisão persistida.

New Horizons é a referência de comportamento para decoração externa. O modelo,
a atmosfera e a base de gameplay continuam GameCube; não foram importados
modelos ou recursos de NH. A primeira entrega evita generalizar centenas de
móveis antes de provar o fluxo completo.

## Evidência de execução local

Candidato integrado: `6d79af919605cb14f133`. Os testes observados usaram contas
sintéticas de desenvolvimento e controles normais da UI/jogo.

| Cenário | Resultado observado |
| --- | --- |
| Abrir a vila por login/Jogar | Instância nativa abriu, identidade e recursos foram conferidos |
| Prévia e cancelamento | Cancelamento não consumiu o barril nem criou objeto persistido |
| Colocação exterior | Barril apareceu com posição/rotação correspondentes à decisão canônica |
| Movimento contra o móvel | Colisão bloqueou passagem enquanto a simulação continuou viva |
| Visita pelo trem | Segundo cliente chegou; duas perspectivas mostraram barril e avatares |
| Retirada | Barril desapareceu nos dois clientes; uma unidade voltou ao bolso autorizado |
| Reposição | Barril reapareceu nos dois clientes; checkpoint do visitante ficou byte a byte igual |
| Conservação de quantidade | Três unidades sintéticas iniciais permaneceram distribuídas entre bolsos e mundo |
| Retorno à vila própria | Visitante retornou e preservou seu estado pessoal |
| Reinício e reabertura | Estado exterior persistido foi restaurado após servidor/clientes encerrarem e reabrirem |

As evidências completas permanecem locais porque incluem render do jogo,
checkpoints, identificadores de teste e dados privados. Este relatório descreve
o resultado auditado; não oferece essas provas como fixtures públicas nem as
substitui por testes unitários.

## Código público relacionado

`shared/world.ts` define objeto, identidade/dono, posição, rotação e revisão;
`web/world-client.ts` valida as listas canônicas, vincula contexto e aplica
estado público/privado pela ponte nativa. São fontes atuais próprias exportadas
sem alteração. O produtor nativo, colisão, UI de prévia e transação do servidor
ainda não integram esta árvore pública, pois aguardam revisão de publicação
por arquivo. Não é possível reproduzir o jogo completo apenas com este recorte.

## Critérios ainda abertos

- Concorrência real de duas tentativas para ocupar a mesma célula.
- Paridade do fluxo com controle físico/adaptado.
- Regressão de casa, arrumação interior, luz/câmera e ações originais.
- Demais critérios de interrupção e consistência definidos no Marco 1.

Compilação, validação de tipos e testes de mocks não fecham esses critérios.
O incremento de interfaces posterior pertence a outro candidato e suas provas
não foram somadas como se estivessem no `6d79`.

## Próximo incremento

Concluir as correções de interface em andamento e depois encerrar os critérios
restantes do móvel exterior com um conjunto fixo de Native/Web/servidor/ABI.
Inventário/atalhos e crafting seguem no plano; WhatsApp permanece posterior.
