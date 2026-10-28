# Retomada — multiplayer fantasma, 28/10/2026

A referência exata desta exportação é `privateCanonicalCommit` no manifesto
(`504d3cf`, branch privada `integracao-1027`, rodada final de 28/10 com a Renna). O manifesto também fixa a origem
de cada arquivo. A fonte completa continua no workspace privado: leia as regras,
o guia de manutenção, o handoff de 26/10 e a triagem da auditoria de 27/10 antes
de mudar componentes.

O GitHub publica 31 fontes próprias selecionadas e documentação. Ele não contém o
jogo executável, o Native/decomp, os providers nem os recursos licenciados.

## Estado e limites

- A versão fantasma está no ar para os amigos desde 27/10 (com wipe e OK escrito
  do operador); a integração de 27/10 entrou em 28/10, sem wipe. O candidato da
  integração de 28/10 está só no ambiente de teste; a troca depende de backup
  verificado e de novo OK escrito, sem wipe.
- Publicar fontes no GitHub não autoriza nem executa essas operações.
- As versões anteriores (RC Opção B, worktrees de 19 e 20/10, builds de 13 a 18/10)
  estão arquivadas no workspace privado, com um bundle Git de todas as branches.

## Continuação

- Jogar a saída de vizinho e um decreto mudado com outra cópia no campo.
- Fechar a duplicação possível dentro de uma mesma rodada de 4 s.
- Esconder "Guardar" do barril para quem não é dono.
- Confirmar áudio e desempenho em iPhone físico.

Usar stores exclusivos da execução e remover as contas de teste ao terminar. Não
editar saves nem afrouxar guards para fazer a QA passar. Máximo de duas instâncias
Native simultâneas no Mac.

Mudou C: rebuild completo e nova medição de ABI. Mudança só em TS reaproveita o
Native byte a byte. Reutilizar motor, Colyseus, SQLite e as unidades da vila;
não criar compatibilidade ou migração especulativa.
