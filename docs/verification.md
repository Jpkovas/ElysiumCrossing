# Verificação — multiplayer fantasma, 27/10/2026

## Recorte público

São 31 fontes próprias copiadas byte a byte do commit privado indicado no
manifesto. Antes do envio foram feitos:

- instalação sem scripts e typecheck;
- 14 testes locais (12 de haptics e 2 de relógio);
- inventário exato, UTF-8 sem NUL, SHA-256 e modos;
- revisão de origem e de conteúdo.

Índice e árvore Git são conferidos separadamente, seguidos da confirmação do
SHA remoto. Os testes públicos não executam Native, servidor real, iPhone ou
deploy. O código completo de servidor, sala e Native é privado.

## Verificação privada delimitada

- **Suíte integrada:** 716 testes, todos passam, e o typecheck não tem erro.
  Os testes antigos de caminhos removidos (entrada pelo canal World, importação
  de save) saíram; os demais seguem as regras atuais. As correções da auditoria
  de 27/10 têm testes novos que falham no código antigo.
- **Unidades da vila:** testes próprios de unidades, cliente de unidades e cartões fantasma passam.
- **Native:** rebuild limpo, com 0 erros. O harness de entrada de morador passou
  com 187 checks e 12 casos fatais.
- **Jogo:** QA em navegador automatizado (Chromium/Playwright, 390x844 e outras
  medidas) com dados novos em servidor isolado. As jornadas conferidas estão no
  [marco de 26/10](milestones/2026-10-26-fantasmas.md) e no
  [marco de 27/10](milestones/2026-10-27-auditoria.md).

Os números acima não equivalem à aprovação do jogador. iPhone físico, áudio
percebido, saída de vizinho e decreto ao vivo seguem sem verificação no jogo.

## Publicação

A publicação destas fontes não alterou produção nem o ambiente publicado de
teste, não trocou releases e não apagou contas ou saves. Dump, mídia,
credenciais, logs e evidências de jogo continuam privados. O recorte não é
jogável sozinho.
