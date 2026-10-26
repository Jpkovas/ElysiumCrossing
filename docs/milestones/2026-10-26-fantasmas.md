# Multiplayer fantasma vira a versão oficial — 26/10/2026

A fonte privada desta exportação é o commit `c66884d` da branch `fantasmas-1025`.
Essa branch nasceu de `dfac020`, a mesma base da build dos amigos. A linha da RC
"Opção B" de 20 a 24/10 (o commit `7b28d75` da exportação anterior inclusive) foi
arquivada no workspace privado e não é a base desta versão. Algumas correções
pequenas da RC foram trazidas; as outras ficaram no arquivo.

Produção e o ambiente publicado de teste não mudaram. Esta publicação de código
não implanta o jogo, não faz wipe e não troca release.

## Modelo

- Cada conta joga o próprio cartão (save completo) e só ela grava esse cartão.
  O servidor aceita o save por CAS de revisão, sem merge de vila.
- Uma lista pequena de trechos do save é da vila inteira (`shared/town-units.ts`).
  Cada trecho tem uma regra de fusão no servidor, decidida pela pré-condição da
  unidade lida e não por uma versão global. Os trechos são:
  - casas e perfis dos moradores;
  - loja do Nook e giroides;
  - nabo, quadro de avisos, caixas de correio e museu;
  - chão, acre por acre, com crescimento diário;
  - vizinhos, visitantes do dia, decretos e outros dados da vila.
- A sala Colyseus leva só presença: posição, cena, chat e emotes. Cada jogador vê
  os outros como fantasmas.
- A página manda só os trechos que mudaram, com o valor anterior, numa rodada
  idempotente. A rodada sai a cada 4 s e logo depois de fechar menu ou conversa.
  O cliente só escreve na RAM o que ainda tem o valor que mandou.
- O canal World, o diário de recuperação compartilhado, a pesca e o plantio pelo
  servidor e a mudança antiga pela estação saíram.
  - O ACK de checkpoint passou para `web/checkpoint-link.ts`.
  - Pesca, plantio e soltar peixe seguem o caminho do Original.

## Funções conferidas no jogo (navegador automatizado, dados novos)

- **Moradores e visitas:**
  - dois ou três jogadores na mesma vila se veem;
  - visita de trem pelo Porter, ida e volta, inclusive recarregando no meio;
  - morador novo por código, com aprovação no site, trem, cor de pele e escolha da casa;
  - a primeira entrada por código passa pelo K.K. com as perguntas de controle e HD.
- **Vila compartilhada:**
  - loja e casa atualizam com a loja aberta, e a casa é refeita atrás de um fade;
  - giroide paga quem vendeu;
  - quadro de avisos, carta com presente, carta da mãe e museu;
  - chão compartilhado: pegar e sacudir fruta, plantar, cortar, enterrar, regar e crescimento do dia;
  - travessuras com limites no servidor;
  - barril fora de casa, com dono;
  - chegada de vizinho compartilhada;
  - clima e sorteios do dia iguais em todas as cópias.
- **Pesca e bricolagem:**
  - pesca pela vara no toque, com a captura entrando no torneio pelo save;
  - bricolagem, Milhas e metas pelo cartão.
- **Sistema:**
  - NES no quarto, com o controle de toque estilo Nintendinho;
  - troca de nome da vila e do personagem, com a vila fechando por um instante;
  - mudança entre vilas pelo site;
  - "Voltar à vizinhança" sai em cerca de 1 s;
  - apagar morador.

## Pendências conhecidas

- Saída de vizinho e decreto mudado ao vivo não foram jogados.
- Duplicação de item possível dentro de uma mesma rodada de 4 s.
- Quem não é dono ainda vê "Guardar" no barril; o servidor recusa.
- Aparelho físico (iPhone) e áudio percebido não foram verificados.
- Suíte privada: 712 testes, 667 passam e 45 falham. As falhas são antigas e
  descrevem a vila compartilhada removida ou têm fixtures defasadas; nenhuma é nova.
- A publicação do jogo para os amigos depende de backup, wipe e OK escrito do
  operador. Nada disso foi feito.

## Build privada

Native com rebuild limpo, 0 erros: 101 exports, 457 imports e `index.data` igual
ao da base. Os textos privados do jogo estão num pacote local próprio, fora daqui.
