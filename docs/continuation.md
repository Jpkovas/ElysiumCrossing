# Retomada — integração de 19/10/2026

A referência desta exportação é a rodada 20, branch privada `integrada-1019`,
commit `dfac0208f86f51288d5981acdd854a4547b376bb`. A promoção dos artefatos é
`4a58f59`: Native79 / Web100 / backend54, projetor11 e transferência29.
A documentação foi atualizada depois da promoção. O manifesto público fixa
cada fonte copiada byte a byte; o jogo completo permanece privado.

## Produção e candidata

No fechamento da rodada 20, produção roda a rodada 19 (`ecb2962`), enquanto
a candidata `4a58f59` está somente no ambiente de teste. A fonte principal
privada acompanha a versão publicada; a candidata tem sua própria branch.
As instruções operacionais completas, host, stores e backups são privados.

Publicar código próprio no GitHub e implantar o jogo são ações distintas.
Qualquer publicação no domínio exige backup verificado e OK escrito do operador.
Wipe anunciado para uma publicação futura não foi executado por este recorte.
Preservar contas e saves até a operação explicitamente autorizada.

## Próximos testes

- Aceitar o trabalho inicial do Nook e conferir continuidade da jornada.
- Escolher morar com amigo e concluir a chegada de trem.
- Ajudar/Visitar entre vilas, embarcar no Porter e retornar.
- Concorrência de quatro jogadores, relógio, desempenho e áudio sob atrasos.
- iPhone físico, reconexão e conservação de inventário, casa e progresso.

Contas de QA pertencem a stores de teste e são removidas ao terminar.
Não editar saves ou afrouxar autoridade para fazer um caso passar.
O Mac permite no máximo duas instâncias Native simultâneas; uma prova com
quatro clientes exige distribuir a execução adequadamente.

## Desenvolvimento

No workspace completo, ler primeiro o `AGENTS.md`, o handoff de integração,
o guia de manutenção e o relatório da rodada. Usar a fonte canônica e os
manifestos correspondentes; não misturar Native, Web ou backend de versões
diferentes. Mudança em C exige rebuild completo e nova verificação de ABI.

Reutilizar motor, Colyseus, SQLite, journal e autoridade existentes. Não criar
compatibilidade ou migração especulativa. Nenhum asset, decomp, executável,
som, texto extraído, credencial ou dado real pode acompanhar esta exportação.
A árvore pública deliberadamente não fornece comando para iniciar o jogo.

Os handoffs de 17/10 e marcos anteriores são históricos. Não interpretar
bloqueios ou provas antigas como estado confirmado da candidata de 19/10.
