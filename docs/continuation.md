# Retomada — multiplayer fantasma, 27/10/2026

A referência exata desta exportação é `privateCanonicalCommit` no manifesto
(`096918f`, branch privada `fantasmas-1025`). O manifesto também fixa a origem
de cada arquivo. A fonte completa continua no workspace privado: leia as regras,
o guia de manutenção, o handoff de 26/10 e a triagem da auditoria de 27/10 antes
de mudar componentes.

O GitHub publica 31 fontes próprias selecionadas e documentação. Ele não contém o
jogo executável, o Native/decomp, os providers nem os recursos licenciados.

## Estado e limites

- Produção e o ambiente publicado de teste não mudaram. A publicação da versão
  fantasma para os amigos depende de três coisas:
  - backup verificado;
  - wipe completo;
  - OK escrito do operador.
- Publicar fontes no GitHub não autoriza nem executa essas operações.
- As versões anteriores (RC Opção B, worktrees de 19 e 20/10, builds de 13 a 18/10)
  estão arquivadas no workspace privado, com um bundle Git de todas as branches.

## Continuação

- Jogar a saída de vizinho e um decreto mudado com outra cópia no campo.
- Fechar a duplicação possível dentro de uma mesma rodada de 4 s.
- Esconder "Guardar" do barril para quem não é dono.
- Confirmar áudio e desempenho em iPhone físico.
- Preparar a publicação para os amigos: backup, wipe e OK escrito.

Usar stores exclusivos da execução e remover as contas de teste ao terminar. Não
editar saves nem afrouxar guards para fazer a QA passar. Máximo de duas instâncias
Native simultâneas no Mac.

Mudou C: rebuild completo e nova medição de ABI. Mudança só em TS reaproveita o
Native byte a byte. Reutilizar motor, Colyseus, SQLite e as unidades da vila;
não criar compatibilidade ou migração especulativa.
