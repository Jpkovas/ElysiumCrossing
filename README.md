# Elysium Crossing

Port para navegador de Animal Crossing GameCube, com integração Deluxe,
autenticação, persistência e recursos multiplayer próprios.

Esta é a **exportação pública sanitizada da auditoria de 19/10/2026**: código
próprio revisado e documentação da candidata local Native85 / Web107 / backend59,
com projetor14 e transferência29. A fonte privada e os
componentes exatos estão em `public-export-manifest.json`. A composição Deluxe
é a base de desenvolvimento desde 17/10. Produção e ambiente de teste publicado
permaneceram preservados durante esta auditoria; o envio destas fontes não
implanta o jogo e não executa wipe.

O recorte contém 33 fontes próprias, contratos e testes. Não executa o jogo
sozinho e não é um backup da composição privada. Native/decomp, recursos
licenciados e dados dos jogadores ficam fora. Consulte o [escopo](docs/public-source-scope.md),
a [retomada](docs/continuation.md) e o [marco atual](docs/milestones/2026-10-19-integracao.md).

## Mudanças da candidata privada

- Renomear personagem e vila pelo gerenciamento existente, preservando IDs,
  conta, residência, casa, inventário e referências tipadas; revisões históricas
  continuam imutáveis. A jornada de renomeação foi verificada no ambiente próprio.
- Entrada alternativa com código privado de WhatsApp para conta já cadastrada,
  inclusive conta administrativa sem linha atual de grupo. Mantém o mesmo UUID,
  saves e passkeys; desafios de login e cadastro são separados.
- Relógio monotônico em site, Native e pesca, com rejeição de amostras atrasadas;
  preparação do Native conserva o tempo gasto carregando recursos.
- Supply de áudio quando o render desacelera, aritmética definida no rollover e
  no ADPCM; perfil controlado reduziu faltas de amostras. Há custo de CPU e isso
  não comprova áudio perfeito em todos os aparelhos.
- Ingresso de moradores e casas concorrentes; renovação diária e reconciliação
  de eventos/caches Native; recuperação explícita de um conflito LIVE com recibo
  e prova Native antes de arquivar o journal.
- Opções gráficas, orçamento de texturas HD e diagnóstico de render por software.

Na candidata final Native85/Web107/backend59, quatro clientes reentraram e
publicaram dois saves aceitos cada. A etapa seguinte voltou a apresentar
**409 de checkpoint em um dos quatro clientes**, depois de abrir/fechar o bolso,
sem nova ação de coleta. Portanto **os quatro clientes ainda não estão estáveis;
há um P1 persistente e a publicação em produção não está aprovada**.

A ponte anterior de pegar fruta passou testes e recuperou capturas originais;
essa correção não encerra o novo conflito observado. As pausas de 8 e 50 segundos
tiveram recuperação na prova anterior Native84. Há também **falha visual em 3x
no WebKit sob investigação**; 1x/2x permaneceram íntegros no ensaio delimitado.
iPhone físico e áudio percebido continuam pendentes.

Os [limites de verificação](docs/verification.md) separam teste, replay e jornada.

O código de acesso pelo WhatsApp foi recebido e confirmado pelo operador em teste
expressamente autorizado; a API conservou o mesmo UUID e recusou replay. O bot
original foi restaurado após o ensaio. Isso não altera a pendência multiplayer.

A implementação completa de login, renomeação, servidor e Native permanece
privada. O recorte atualiza somente clientes/contratos próprios selecionados;
este resumo de funções não implica que todo seu código esteja nesta árvore.

## Verificar o recorte público

Requer Node 24 e as dependências declaradas no lockfile:

```sh
npm ci --ignore-scripts
npm run typecheck
npm test
npm run verify:export
```

São 60 testes locais/controlados: 44 de pesca/continuidade, 12 de haptics e 4 de
relógio. Eles não executam Native nem deploy. O manifesto fixa origem, bytes,
SHA-256 e modos Git; índice e árvore do commit são verificados antes do push.

A base Native privada usa
[ACGC-Deluxe-PC-Port](https://github.com/imcynic/ACGC-Deluxe-PC-Port/tree/92b0a638ce9e686b3303b4d0ec985a1a99a7f962)
e a integração anterior de
[slider](https://github.com/turtlekiosk/slider/tree/cfecc8d4019c7182133b444a671d3b62b42bee44).
Nenhum arquivo desses checkouts Native foi copiado para esta árvore.
Licenças do código não concedem direitos sobre assets do jogo; não se atribuiu
por inferência uma licença nova ao código próprio.

Marcos anteriores permanecem em `docs/milestones/`, atribuídos às respectivas
builds. Dumps, assets, fontes, textos extraídos, áudio, saves, sessões,
credenciais, certificados, capturas e logs privados não são publicados aqui.
