# Verificação — publicação Deluxe de 17/10/2026

## Recorte público

Node 24. Instalação sem scripts, inventário por manifesto, UTF8 sem NUL, hashes,
modos, índice/árvore Git e origem byte a byte são verificados antes do push.
`npm run typecheck` passou. `npm test` executa 57 casos: 43 de pesca, 12 de haptics e 2 de relógio,
sem skips. São testes locais/controlados; não executam Native, salas reais ou deploy.
Os resultados finais e SHA remoto são registrados no relatório da publicação.

## Composição privada

A promoção local conferiu 127 hashes e copiou 7.302 fontes byte a byte, antes dos
ajustes documentais e launcher. A base anterior foi preservada em bundle Git e
arquivo físico completo, com 7.199 arquivos conferidos; ignorados e symlinks mantidos.
O launcher principal passou health 200/HTML Web 35/recursos privados anônimos 401,
com relógio real e store novo separado. O processo usado no smoke foi encerrado.

O typecheck global foi executado novamente:53 diagnósticos, todos em fixtures de
testes, principalmente providers obrigatórios, identidade e learnedRecipes.
Nenhum diagnóstico de produto. Não foi apresentada a suíte global como verde.

A pescaria real 33/35 confirmou item no bolso/coleção e Ranking 0 → 1, save, reinício e
reentrada. Jardinagem individual, coabitação e mudança têm provas atribuídas às
builds no [marco](milestones/2026-10-17-deluxe.md). A nova entrada do segundo
perfil 33/35 encontrou 409 antes de movimento. O journal foi preservado; causa ainda
inconclusiva. Dois moradores no mesmo jardim e regressão final de visita/retorno
continuam pendentes. Nenhum teste com zero casos, build ou resumo foi usado como
substituto de fluxo real.

## Recursos e publicação

Não foram enviados recursos do jogo, dados privados ou logs; os artefatos completos
permanecem locais. O recorte não é jogável sozinho. Nenhum deploy do jogo, alteração
no PC/Cloudflare/domínio ou reinstalação do navegador foi realizado nesta promoção.

Quatro testes que leem `app.ts` e o CSS da UI completa foram separados em
`tests/town-notice.test.ts` no workspace privado. Permanecem executados ali;
o recorte público publica os 43 testes do cliente sem copiar essa UI. Não há skips
ou filtros para transformar dependências ausentes em aprovação.
