# Verificação — exportação de 19/10/2026

## Recorte público atual

Node 24; instalação sem scripts; typecheck; 57 testes locais/controlados,
sem skips: 43 de pesca/continuidade, 12 de haptics e 2 de relógio.
Não executam Native, servidor real, quatro clientes, iPhone ou deploy.

A publicação exige inventário exato por manifesto, UTF-8 sem NUL, hashes,
modos, origem byte a byte e revisão de conteúdo. Índice e árvore Git precisam
corresponder ao mesmo manifesto. A confirmação do SHA remoto ocorre depois
do push. O relatório privado conserva os resultados e os comandos executados.

## Evidência privada da rodada 20

O handoff da integração registra rebuild Native limpo de 4.040 unidades,
ABI de checkpoint 23/156, eventos16, layout compartilhado conferido e
160 hashes em `verify:current`. A suíte global registrou 906/1.205 casos
aprovados, com 299 falhas herdadas; typecheck global tinha 54 diagnósticos
herdados. Esses resultados históricos pertencem à composição privada,
não foram repetidos por esta exportação e não tornam a suíte global verde.

O QA registrado jogou com conta nova em store separado: escolha no site,
pergunta do K.K., trem, chegada, casa, pagamento, recusa do trabalho do Nook
com mapa, nomes de vizinhos e telemetria. Sons autenticados foram observados;
a conferência de todos os sons permanece pendente.

Ainda não verificado nesta candidata: aceitar o trabalho do Nook, chegar
para morar com amigo, Ajudar/Visitar com embarque real no Porter e iPhone
físico. Auditoria de áudio, desempenho, relógio e concorrência de quatro
jogadores está em andamento e exige evidência própria.

## Publicação

Este envio publica código próprio e documentação sanitizada. Não implanta
o jogo, altera serviços, troca releases ou apaga contas/saves. Os artefatos
privados, evidências e dados continuam locais. O recorte não é jogável sozinho.
