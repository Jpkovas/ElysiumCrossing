# Auditoria de código do multiplayer fantasma — 27/10/2026

A fonte privada desta exportação é o commit `096918f` da branch `fantasmas-1025`,
sobre o marco de 26/10 (`c66884d`). Uma auditoria de código listou 45 achados.
Cada um foi comparado com o comportamento esperado (Original/Deluxe, regras do
projeto e modelo fantasma) antes de virar correção. Produção e o ambiente
publicado de teste não mudaram, e nada foi implantado.

No recorte público muda só `web/checkpoint.ts`: a recuperação automática de uma
cópia local agora aceita a recusa `recovery_superseded` do servidor. O resto das
correções está no servidor, na sala e no Native, que são privados.

## Corrigido

- **Rodadas de unidades da vila:**
  - uma resposta da vila anterior não chega mais na RAM da vila nova;
  - uma rodada recusada é refeita da RAM com a base mantida;
  - a rodada sem resposta desiste depois de 20 s e repete com o mesmo id.
- **Disputa entre dois jogadores na mesma rodada:** quem perde é acertado pela
  fila de entregas que já existia.
  - Item do chão, achados e perdidos e fruta recusada pelo limite: o item que a
    vila não tinha mais sai do bolso de quem perdeu, sem negativar.
  - Giroide: o dono recebe um pagamento só. Se o dono perde o item novo numa
    troca, ele recebe de volta.
  - Crescimento do dia recusado: o chão inteiro fica com a versão da vila e o
    bolso é acertado. Juntar tile por tile duplicaria fósseis e mato.
  - Carta que sai da caixa de correio do próprio jogador volta ao correio e
    chega na próxima entrega (Native).
- **Recuperação de cópia local:** o servidor marca as revisões do cartão que ele
  mesmo gravou. A cópia só é publicada se nenhum save do jogo entrou depois dela.
  Se entrou, a cópia é arquivada e o jogador vê o aviso de que jogou em outro
  aparelho.
- **Moradores e vilas:**
  - visitante não reivindica casa nem perfil da vila visitada;
  - vila de tutorial abandonada perde as unidades compartilhadas;
  - morador apagado que entra em outra vila recebe o cartão dela;
  - o fundador consegue se mudar depois de passar a chave.
- **Metas, torneio e semana:**
  - metas leem o passaporte durante a viagem e contam os marcos da conta;
  - ajuda de amigo que quita a dívida registra a meta;
  - a semana apurada com atraso termina onde a próxima começou;
  - a base do museu da semana é gravada antes de uma doação pelas unidades;
  - o dia da coleta de materiais inclui o ano.
- **Pesca e insetos (Native):**
  - peixe guardado por troca com o bolso cheio entra no registro de capturas;
  - a primeira captura de uma espécie com o bolso cheio travava o jogador antes
    da pergunta "trocar ou soltar". A correção vale para vara e rede.
- **Saída, troca de nome e mudança:** a saída tem limites de tempo e o progresso
  pendente tem mais tentativas de salvar antes de a vila fechar.
- **Entrada local:** os comandos da raiz abrem a build da versão fantasma,
  fixada por hash, com uma pasta de dados própria.

## Descartado ou mantido

- Oito achados foram descartados: falso positivo, regra escolhida ou sem efeito
  na escala dos amigos.
- O fundo de vídeo do login sem sessão é o comportamento correto, por decisão do
  operador.
- Compra simultânea do último produto: quem perdeu fica com o item que pagou.
- Semente de armadilha recusada não é devolvida.
- Uma doação cuja resposta se perdeu ainda pode reabilitar o botão.

## Verificação

- Cada correção de servidor tem teste novo que falha no código antigo.
- **Suíte privada:** 717 testes, 680 passam e 37 falham. As 37 falhas são as
  mesmas da base e são antigas; nenhuma é nova.
- **Typecheck:** sem erro em `web/`, `server/` e `shared/`. Os 23 erros restantes
  estão em testes antigos.
- **Native:** rebuild limpo com 0 erros. A ABI é igual à da base: 101 exports,
  457 imports e o mesmo `index.data`.
- **Jogo:** navegador automatizado com dados novos em servidor isolado. A troca
  de peixe com o bolso cheio e a primeira captura foram jogadas, e a build final
  abre sem erro. A disputa de carta não foi reproduzida no jogo.
- iPhone físico e áudio percebido seguem sem verificação.

A publicação do jogo para os amigos continua dependendo de backup, wipe e OK
escrito do operador. Nada disso foi feito.
