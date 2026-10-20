# Retomada — auditoria de integração de 19/10/2026

A referência exata desta exportação é `privateCanonicalCommit` no manifesto,
que também fixa as versões de Native/Web/backend/projetor/transferência e a
origem de cada arquivo. O envio inicial da rodada20 foi `74099c6`; esta rodada
acrescenta a auditoria e as correções locais subsequentes.

A fonte completa continua no workspace privado. Ler as regras, manutenção,
relatório incremental e manifestos correspondentes antes de modificar componentes.
O GitHub publica33 fontes próprias selecionadas e documentação; não contém o
jogo executável, seu Native/decomp, providers ou recursos licenciados.

## Estado e limites

Produção e o ambiente de teste publicado permaneceram preservados nesta
auditoria. Deploy e wipe são operações posteriores, com backup verificado e
OK escrito do operador. Publicação de fontes no GitHub não autoriza nem
executa essas operações.

As correções incluem relógio, áudio, ingresso, eventos diários, recuperação
LIVE, renomeação, opções gráficas e login alternativo WhatsApp. A renomeação
teve prova em jogo próprio; a autenticação OTP teve HTTP/cookie, preservação
de conta e compatibilidade do consumidor real do bot com gateway falso.
Um ensaio posterior autorizado pelo operador entregou um código privado real,
com recebimento confirmado, login na mesma conta e replay recusado. O bot
original foi restaurado depois do ensaio. O ajuste do texto privado permanece
como patch operacional separado.

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

## Continuação da qualificação

- Confirmar quatro clientes na candidata final, incluindo ACK, fantasmas,
  interação compartilhada, reconexão, saída e reentrada sem progresso perdido.
- Conferir aceitar o trabalho do Nook, morar com amigo e Visitar/Ajudar com
  embarque real no Porter nos caminhos ainda pendentes.
- Repetir renovação diária em sessões independentes; manter a prova de que
  moradores posteriores também avançam sem alterar dados alheios.
- Confirmar áudio/desempenho no iPhone físico e no navegador real do jogador.
- Repetir login alternativo nos aparelhos necessários sem alterar passkeys,
  mantendo o teste real autorizado já confirmado como evidência delimitada.

Usar stores exclusivos da execução; remover contas fictícias ao terminar.
Preservar journals e capturas recusadas; não editar saves ou afrouxar guards
para fazer QA passar. Máximo de duas instâncias Native simultâneas no Mac.

Mudou C: rebuild completo e nova medição ABI. Não misturar Native, Web, backend
ou projetor de pins diferentes. Reutilizar motor, Colyseus, SQLite, journal e
autoridade existentes; não criar compatibilidade ou migração especulativa.
