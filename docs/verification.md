# Verificação — auditoria de 19/10/2026

## Recorte público

São 33 fontes próprias copiadas byte a byte do commit privado indicado no
manifesto. Antes do envio: instalação sem scripts, typecheck, 60 testes locais
(44 pesca/continuidade, 12 haptics, 4 relógio), inventário exato, UTF-8 sem NUL,
SHA-256/modos, origem e revisão de conteúdo. Índice e árvore Git são conferidos
separadamente, seguidos da confirmação do SHA remoto.

Os testes públicos não executam Native, servidor real, iPhone ou deploy.
O código completo de autenticação/servidor e os harnesses Native são privados.

## Verificação privada delimitada

A suíte integrada mais recente comunicada nesta rodada registrou
**1098/1258 casos aprovados, 160 falhas, zero skips**. A redução das falhas herdadas
veio de atualização/classificação de fixtures; a suíte global não está verde.
O typecheck integrado chegou a zero diagnósticos. O relatório privado fixa os
SHAs e resultados finais; não inferir aprovação do jogador desses números.

A revisão independente executou 102 casos focais de identidade, compositor,
ingresso, CAS, relógios, pesca e autoridade. Renomeação foi conferida no jogo e
por testes de IDs/casa/inventário/NES, histórico imutável e referências tipadas.
OTP teve 12 testes de HTTP/bot: mesma conta e save, passkeys preservadas, replay,
concorrência, rollback, limites, expiração, resposta uniforme e Origin/cookies.
A conta administrativa sem cadastro atual do grupo também pôde recuperar acesso;
revogação continuou bloqueada. Consumidor real do bot com gateway falso foi
compatível. Depois, um teste real expressamente autorizado entregou um código
privado confirmado pelo operador: mesma conta na API, replay recusado e bot
original restaurado. Não se confunde esse ensaio com implantação de nova release.

Harnesses C/WASM testaram supply/ring em seis taxas de render, rollover,
apresentação silenciosa e produtor indisponível. O ADPCM corrigido conservou
PCM em 640 vetores/10.240 amostras. Relógio Native teve 18 casos/53 checks, inclusive
entrega atrasada de 50 segundos. Isso não comprova qualidade acústica no iPhone.

A auditoria identificou um gap temporal HRA entre dois logins no mesmo dia.
A estratégia final restaura a transição global GC, consome o latch diário online,
limpa estado transitório na importação e sincroniza caches salvos. O projetor
prova a transição temporal antes de aplicar somente os bits permitidos depois
do compositor. Onze casos independentes HRA/entrada passaram; a proposta
provisória de preparar HRA separadamente na entrada foi removida.

## QA real e limitações

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

A publicação destas fontes não alterou produção ou o ambiente publicado de
teste, não trocou releases e não apagou contas/saves. Dump, mídia, credenciais,
logs e evidências de jogo continuam privados. O recorte não é jogável sozinho.
