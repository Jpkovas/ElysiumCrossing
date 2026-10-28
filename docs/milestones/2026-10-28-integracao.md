# Integração das frentes de 28/10/2026

A fonte privada desta exportação é o commit `a928fa0` da branch
`integracao-1027`, sobre a versão no ar (`70d6442`, no domínio desde 28/10 às
00h05Z, sem wipe). Ela junta mais três frentes num candidato antes do
Halloween. O candidato foi instalado só no ambiente de teste do operador. A
troca no domínio depende de backup verificado e do OK escrito do operador.

No recorte público mudam dois arquivos:

- `shared/crafting.ts`: cada folha de receita tem loja (`miles` ou `nook`) e
  estágio, e `MILES_SHEETS` lista as da loja de Milhas;
- `shared/crafting-recipes.json`: os mesmos doze itens, agora com loja e
  estágio.

`shared/ranking.ts` continua na versão de 27/10. A versão nova depende de
tabelas geradas do código do jogo (calendário de eventos, troféus e
lembranças), que ficam privadas.

## Frentes

- **Progressão de metas:**
  - estágios de 1 a 4, liberados por metas ou por horas de jogo;
  - metas secretas, de evento (Halloween, Tortimer) e de visitante;
  - receitas em duas lojas: umas na loja de Milhas, outras na loja do Nook,
    pelo tamanho da loja;
  - aviso no jogo quando uma meta paga.
- **Rankings de eventos:**
  - Festas (troféus do Tortimer), Lembranças (móveis de evento) e Aeróbica
    (dias carimbados no cartão do rádio);
  - categorias sazonais só de 3 dias antes a 3 dias depois do evento, pelo dia
    de São Paulo do servidor.
- **Ginástica matinal:** o Copper e o Tortimer da aeróbica aparecem quando o
  jogador chega à praça depois das 6h.

## Verificação

- **Suíte privada:** 757 testes, todos passam, e o typecheck não tem erro.
- **Native:** rebuild completo limpo, sem erros. A ABI é igual à da versão no
  ar: 101 exports, 457 imports e o mesmo `index.data`.
- **Jogo e site:** navegador automatizado com dados novos em servidor isolado,
  com os mesmos artefatos do candidato, retrato 390x844. Foram vistos:
  - 28/7 às 6h: Copper, Tortimer e os quatro
    moradores na praça; o Tortimer dá o cartão e o ranking Aeróbica vai de 0
    para 1;
  - 2/11: loja do Nook com as duas folhas do estágio 1 no estoque; painel de
    metas no estágio 1 e loja de Milhas com Gaiola e Tampa de bueiro;
  - 2/11: faixa do Ranking com nove categorias da lista do servidor mais a
    Liga, sem Aeróbica; a lista exige sessão;
  - Halloween, 31/10 às 19h: evento ativo, Jack conversa e faz travessura, sem
    crash.
- **Não verificado nesta rodada:** iPhone físico, áudio percebido e o
  pagamento das metas de visitante no jogo (coberto só por testes).

## Rodada final de 28/10

O candidato passou a ser o commit privado `2518cf4`, com mais duas frentes por
cima do `a928fa0`:

- **Torneio sazonal e pendentes:**
  - tema novo do torneio toda segunda, pontos na temporada do mês e prêmios do
    mês e do trimestre;
  - selos no perfil e na Liga, moldura no retrato do pódio;
  - correção preventiva da trava na conversa de Halloween;
  - textos em PT-BR revisados;
  - cornetinha do Deluxe, vendida na loja do Nook de 16 a 30/12.
- **Roubo e ajuda:**
  - o roubo passa a ser escolhido no giroide e só atinge quem está fora do jogo;
  - doação de Bells sem taxa;
  - obras da estação com premiação dos três maiores doadores;
  - qualquer móvel pode ficar ao ar livre;
  - a obra pronta decora todas as vilas (árvore de Natal, luzes, pontes
    vermelhas) e as obras de 2027 trazem efeitos próprios (vaga-lumes, fogos aos
    sábados de agosto, canteiros e pétalas);
  - o prêmio do Natal é o machado dourado; "Roubar" usa uma opção de menu fora da
    faixa que o Deluxe reserva para a Renna.

No recorte público muda `shared/town-units.ts`: o pedido de móvel ao ar livre
leva o item. `shared/competition.ts`, `shared/contracts.ts` e `shared/world.ts`
ficam na versão anterior. As versões novas dependem do calendário de eventos e
das formas dos móveis, tabelas geradas do jogo que continuam privadas.

### Verificação da rodada final

- Suíte privada com 774 testes, todos passam; typecheck limpo.
- Rebuild Native completo e limpo. Os imports são iguais aos da versão no ar, e
  há três exports novos (roubo pelo giroide e efeitos das obras). O Native e o site são
  trocados juntos.
- Navegador automatizado, servidor isolado, retrato 390x844, Halloween de
  31/10 às 18h30:
  - o morador fantasiado pede doce, "Claro!" abre o bolso, o doce é entregue e
    a conversa termina (duas vezes seguidas, com dois moradores);
  - o site abre Início, Vila, Ranking, Torneio e a página da obra de Natal sem
    erro, com o machado dourado no prêmio.
- A troca no domínio inclui um passo no banco (a tabela de móveis ao ar livre
  passa a aceitar qualquer móvel). O passo foi ensaiado no ambiente de teste do
  operador e roda com backup e o servidor parado.
- **Não verificado nesta rodada:**
  - roubo pelo giroide no build integrado (foi verificado pela frente no build
    dela);
  - iPhone físico e áudio.
