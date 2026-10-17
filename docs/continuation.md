# Retomada — Deluxe principal, 17/10/2026

## Decisão e fonte de verdade

O usuário promoveu a composição experimental Deluxe a versão principal e pediu
publicação do progresso com pendências documentadas. A decisão substitui a build H
como direção de desenvolvimento; não afirma QA completo nem autoriza deploy.

No workspace completo, a fonte agora é `canonical/`, branch `main`. O laboratório
original e as outras worktrees foram preservados. A raiz encaminha os comandos
npm à fonte canônica; ler o `AGENTS.md` e `docs/continuation.md` locais antes de
retomar. Não sobrepor árvores antigas nem usar um handoff histórico como baseline.

Composição: Native 33 / Web 35 / backend 24, projetor 10 e transferência 29.
`current-version.json` local e os manifestos fixam fontes/artefatos por hash.
O GitHub contém um subconjunto próprio, não os providers privados nem o executável.

## Próximo passo: entrada do segundo morador

PrioridadeP0: o primeiro boot de um morador já vinculado, em perfil independente,
recebeu HTTP409 em `/api/saves` antes de movimento. O iframe Native foi retirado
pela recuperação. A cópia C/B/contexto ainda precisa ser exportada e comparada
com o canônico. Não há causa demonstrada; não apagar journal, normalizar bytes
ou afrouxar guards para atravessar esse ponto.

A única cópia local ainda não exportada está no IndexedDB de uma janela incógnita
própria do Dia, que foi mantida aberta. Não fechar essa janela antes do backup.
A proteção self-XSS do Console bloqueou a colagem do diagnóstico readonly;
nenhum código foi executado para ultrapassá-la. A liberação exige intervenção
humana e ficou pendente. A autenticação autorizada no lobby já havia passado.

Após obter a cópia integral com buffers e hashes:

1. Congelar o canônico e reproduzir a recusa com C/B/contexto originais.
2. Corrigir somente a causa demonstrada, mantendo autoridade, identidade e
   conservação dos demais moradores, casas, mapa e inventários.
3. Repetir a entrada desde perfil independente, sem edição de save ou RAM.
4. Reunir os dois moradores no jardim, observar a mesma rega/recibo, desconectar
   e reconectar, sair normalmente, reiniciar e reabrir; conferir conservação.

O aviso `JKRAramPiece.cpp:102: Abort.` foi rastreado no WASM como diagnóstico não
fatal de alinhamento 32. Ele não demonstra crash causal nem explica o HTTP409.
Sem os argumentos históricos da transferência, não declarar essa DMA verificada.

## Depois: regressões e preparação para amigos

- P1: visita e retorno entre vilas na composição final, com roupa, pele e desenho
  remotos, interação compartilhada e conservação após reconexão.
- P1: corrigir fixtures da suíte/typecheck global que ainda usam contratos antigos;
  os 53 diagnósticos atuais ficam em testes, sem erro de produto nessa execução.
- P1: rever módulos Deluxe não exercitados/stubs e sua origem. Build/link não
  comprova design, storage, ordinances, museu ou todas as espécies.
- P1: preparar pacote fechado, repetir checks no host alvo e no domínio, somente
  quando houver autorização de deploy. PC/Cloudflare/produção não foram alterados.
- Futuro: crafting além das três receitas, extensão do ranking, terreno amplo e
  WhatsApp. Não ampliar esses sistemas para adiar a primeira versão para amigos.

## Execução local e dados

O launcher principal usa relógio real e store novo `data/deluxe-main-v7/`.
Saves antigos não são migrados. O laboratório de reprodução mantém seu store e
relógio +156 h separados; isso foi um cenário de QA, não dias reais decorridos.
A origem local 3478 é reutilizada, sem trocar portas desnecessariamente.

Antes de rodar, `npm run verify:current` no workspace completo confere 127 hashes
iniciais de fontes/artefatos. `npm start` da raiz inicia a fonte canônica com os
providers privados existentes. Ao modificar componentes, produzir novos pins e
artefatos deliberadamente; não contornar divergência de hash ou servir uma build
antiga com o nome da nova.

## Evidências e histórico preservado

O workspace privado conserva a fila, o relatório atual, o relatório de pesca,
capturas, recibos, replays e os manifestos da composição. O marco público resume
os resultados sem copiar dados privados. As verificações antigas permanecem
atribuídas às suas builds, sem serem promovidas a prova da versão atual.

A base anterior foi preservada em branch de arquivo, bundle completo verificado
e arquivo físico com 7.199 arquivos conferidos. Worktrees e WIP não relacionados
permaneceram no lugar. O laboratório fonte não foi modificado na promoção.

Nenhum servidor de QA próprio ficou em execução. A janela incógnita citada é a
exceção necessária para preservar o journal ainda não exportado. Reavaliar esse
estado ao retomar; o armazenamento do navegador pode ter mudado desde este handoff.
