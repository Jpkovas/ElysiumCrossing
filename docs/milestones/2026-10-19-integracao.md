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

Na candidata final Native85/Web107/backend59, quatro clientes reentraram e
publicaram dois saves aceitos cada. A etapa seguinte apresentou **409 stale_save
por avanço concorrente da revisão canônica**, depois de abrir/fechar o bolso,
sem nova coleta. Um Reconectar manual recuperou a mesma captura/conta por recibo
e permitiu novo save aceito e UI pronta. A ponte anterior de pegar fruta foi
corrigida; esse caso posterior é de CAS, sem violação econômica comprovada.

**Permanece um P1 de experiência: quatro clientes ainda podem pausar e exigir
Reconectar manual. O multiplayer não está qualificado como estável/automático
e a publicação em produção não está aprovada.** As pausas de 8 e 50 segundos
tiveram recuperação na prova anterior Native84.

A falha visual em 3x no WebKit foi reproduzida também na Native84 em comparação
limpa: é P2 preexistente, sem atribuição à 85; 1x/2x ficaram íntegros no ensaio.
iPhone físico e áudio percebido continuam pendentes.

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
