# Integração e auditoria — 19/10/2026

O envio inicial desta data documentou a rodada20 (Native79/Web100/backend54).
A revisão atual publica o recorte próprio da candidata posterior de auditoria.
O manifesto fixa SHA de origem, componentes e hashes exatos; a fonte completa
e seus artefatos permanecem privados. Produção e ambiente publicado de teste
não foram alterados por esta rodada de publicação de código.

## Incrementos

- Renomeação pelo site com identidade tipada e publicação transacional;
  referências, IDs numéricos, casa, inventário, NES e histórico preservados.
- Entrada alternativa WhatsApp com desafios de login separados do cadastro,
  código de uso único e sessão comum da mesma conta; passkeys continuam válidas.
- Relógios monotônicos e bootstrap sem perder o tempo de carregamento;
  snapshots de pesca atrasados não fazem a apresentação recuar.
- Supply de áudio sob render lento, rollover definido e ADPCM sem shift
  negativo indefinido, preservando o PCM testado.
- Ingresso/casas concorrentes, renovação diária, recuperação LIVE explícita
  com recibo+prova Native, reconciliação de cache NPC e diagnóstico gráfico.

A Native84 chegou a quatro clientes saudáveis, três fantasmas por cliente e
saves aceitos; pausas de 8 e 50 segundos também passaram. Pegar fruta revelou
P1 em qualificação, com recibos entregues e UI sem completar, preservando
progresso. A ponte posterior passou testes/replays; a conferência final no
navegador continuava pendente. Há falha visual em 3x no WebKit sob investigação.
A candidata final Native85/Web107/backend59/projetor14 foi congelada depois:
a jornada completa dessa versão e a publicação do jogo não estão aprovadas.
iPhone físico e áudio percebido continuam pendentes. Consulte a [verificação](../verification.md).

## Publicação e recursos

Somente33 fontes próprias e documentação sanitizada. Nenhum C/decomp, WASM,
dump, asset, áudio, fonte, texto extraído, save, credencial ou captura acompanha
a exportação. Funções da composição privada são descritas com seus limites;
essa descrição não afirma que a implementação inteira esteja no recorte.

Não houve deploy nem wipe. A publicação do jogo exige backup verificado e OK
escrito. O texto da mensagem privada do bot tem patch operacional separado. A
compatibilidade passou com gateway falso; um ensaio real posterior autorizado
entregou um código confirmado pelo operador, mesma conta e replay recusado.
O bot original foi restaurado após esse ensaio.
