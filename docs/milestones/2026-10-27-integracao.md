# Integração das frentes de 27/10/2026

A fonte privada desta exportação é o commit `70d6442` da branch `fantasmas-1025`,
sobre a versão no ar (`f4b95c9`). Ela junta sete frentes num só candidato antes
do Halloween. O candidato foi instalado só no ambiente de teste do operador.
A troca no domínio depende de backup verificado e do OK escrito do operador.

No recorte público mudam três arquivos:

- `shared/ranking.ts`: categoria do torneio do Chip e títulos das categorias
  para o Ranking novo do site;
- `shared/town-units.ts`: a data de aniversário de cada morador fica no próprio
  cartão, fora da unidade de eventos da vila;
- `shared/contracts.ts`: `tutorialOwner()` dá a chave dos tutoriais de toque.

O resto está no Native, no servidor, no site e nos textos do jogo, que são
privados.

## Frentes

- **Eventos do Deluxe:**
  - assinaturas exatas no wasm (Halloween, poço, contagem regressiva, Nook, K.K.);
  - torneio de pesca aos domingos de junho e novembro, com o Chip dando vara;
  - fogos de agosto e o Dia dos Voluntários;
  - Jack com doze presentes;
  - santuário sem crash;
  - regador com o próprio modelo na loja;
  - entrada que não falha depois de uma carta para um morador ausente.
- **K.K., porta e dívida:**
  - o K.K. fala de convidar amigos uma vez;
  - a fanfarra do Nook toca logo depois da recusa do trabalho;
  - o Nook diz quanto falta da dívida, e a atendente oferece "Pagar dívida";
  - a pílula da vila avisa que abre o menu.
- **Desempenho:** o retrato tem chave estável, e os saves vão como Blob.
- **Tutoriais de toque:** cada morador de cada vila aprende uma vez.
- **Telemetria:** erros do cliente saem em até 5 s.
- **Menus e navegação do site:**
  - quatro abas (Início, Vila, Amigos, Ranking);
  - Ranking com faixa de categorias, arraste e linha própria presa;
  - página Moradores no jogo;
  - calendário da vila com aviso do dia ao entrar.

## Verificação

- **Suíte privada:** 738 testes, todos passam, e o typecheck não tem erro. Uma
  rodada anterior teve uma falha de tempo em `rooms.test.ts` sob carga; o
  arquivo passou sozinho três vezes e na suíte seguinte.
- **Native:** rebuild completo limpo, sem erros. A ABI é igual à da versão no
  ar: 101 exports, 457 imports e o mesmo `index.data`. A navegação nova não
  muda C.
- **Jogo e site:** navegador automatizado com dados novos em servidor isolado,
  com os mesmos artefatos do candidato, retrato 390x844 com toque. Foram vistos:
  - falas do K.K.;
  - dívida do Nook;
  - pílula, menus e página Moradores;
  - tutoriais;
  - erro de JS chegando ao servidor na hora;
  - Halloween sem crash (fantasia, Jack, Tortimer);
  - torneio de domingo com a vara do Chip;
  - regador na loja;
  - carta para morador ausente;
  - as quatro abas em quatro medidas;
  - arraste do Ranking por toque e mouse;
  - aviso do dia.
- **Não verificado nesta rodada:** o santuário (as vilas de teste tinham poço),
  iPhone físico e áudio percebido.
