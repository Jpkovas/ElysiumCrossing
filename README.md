# Elysium Crossing

Desde 17/10/2026, **a composição Deluxe é a base principal de desenvolvimento**,
por decisão do usuário. Ela substitui a build H como ponto de partida. Native 33,
Web 35 e backend 24 foram preservados com versões, hashes, evidências e trabalho
pendente. Isso não é um lançamento de produção nem um deploy do jogo.

Este repositório público contém **código próprio revisado e documentação**.
A composição completa, Native, providers e recursos do jogo permanecem no
workspace privado. O recorte público não executa o jogo sozinho e não é um backup
dos recursos privados. Veja [o escopo das fontes](docs/public-source-scope.md).

## Começar a retomada

1. Leia [o handoff atual](docs/continuation.md).
2. Confira [o marco Deluxe](docs/milestones/2026-10-17-deluxe.md), que separa
   implementação, provas reais e limites.
3. No workspace completo, trabalhe em `canonical/`, branch `main`; o `npm start`
   da raiz usa essa fonte, relógio real e um store novo separado do QA.
4. O primeiro bloqueio é a entrada de um segundo morador com HTTP409, antes de
   qualquer movimento. A cópia local permanece preservada; não a descartar para
   fazer o teste passar. Jardinagem compartilhada/reconexão ainda não passaram.

## Entregas com evidência delimitada

- Entrada, Vilas/Amigos, nuvem aprovada, tipografia HD e retrato Native animado;
  códigos pessoais/de vila, amizade aceita e lista das vilas dos amigos.
- Bolso touch: selecionar, segurar para opções e arrastar; transições de cartas,
  papel animado e continuidade da música; ajustes de diálogos, pele, mapa e trem.
- Três receitas funcionais: barril, banco e mesa, com compra, aprendizado,
  materiais, caderno, criação, uso, save e reentrada. Crafting amplo é futuro.
- Jardinagem individual com compra, plantio, rega, crescimento/cruzamento em
  calendário simulado e reentrada após reinício. A prova concorrente está aberta.
- Coabitação com escolha da casa no jogo, duas partidas simultâneas, aparência
  própria, casas distintas e saída normal nas builds registradas.
- Mudança pela estação, aviso antes da viagem, inventário/casa preservados,
  casa escolhida no destino e reabertura após reinício. Payload NES real não
  estava presente no cenário.
- Pesca 33/35: uma captura real no rio, peixe no bolso/coleção, Ranking 0 → 1,
  saída normal, reinício e reentrada conservando o resultado.

Essas provas pertencem às builds e cenários descritos no marco. Não estabelecem
paridade de todo o Deluxe, de todas as espécies ou de todos os caminhos multiplayer.

## Verificar o recorte público

Requer Node 24. Dependências declaradas no lockfile, sem código vendorizado:

```sh
npm ci --ignore-scripts
npm run verify:export
npm run typecheck
npm test
```

O recorte executa 57 testes: 43 de pesca/continuidade, 12 de haptics e 2 de relógio.
São testes locais/controlados; não executam o Native ou um deploy. A verificação
completa e os limites herdados estão em [docs/verification.md](docs/verification.md).

A base Native foi composta localmente a partir de
[ACGC-Deluxe-PC-Port](https://github.com/imcynic/ACGC-Deluxe-PC-Port/tree/92b0a638ce9e686b3303b4d0ec985a1a99a7f962)
e da integração anterior de
[slider](https://github.com/turtlekiosk/slider/tree/cfecc8d4019c7182133b444a671d3b62b42bee44).
Nenhum arquivo desses checkouts Native foi copiado para esta árvore pública.
Licenças do código não concedem direitos sobre assets do jogo; não se atribuiu
por inferência uma licença nova ao código próprio.

O histórico da build H e dos marcos anteriores permanece em Git e em
`docs/milestones/`. Somente o handoff atual escolhe a base vigente. Dumps, assets,
textos extraídos, saves, sessões, credenciais, certificados e logs privados não
fazem parte desta publicação. WhatsApp permanece futuro.
