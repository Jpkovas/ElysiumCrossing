# Arquitetura de referência

Auditoria inicial de 12/10, atualizada para esta exportação em 14/10/2026.
As descrições abaixo distinguem a implementação local completa do subconjunto
de código publicado. Não há um motor novo ou um segundo protocolo de rede.

## Componentes existentes

| Responsabilidade | Implementação local | Código desta exportação |
| --- | --- | --- |
| Motor e renderização | Port C de GameCube com adaptações de plataforma, câmera, HUD e ponte para navegador | Fora; upstream fixado e alterações nativas dependem de revisão de publicação |
| Input e apresentação mobile | Camada Web e consumidores nativos semânticos; ações contextuais, toque direto, joystick e gestos | Tipos em `shared/contracts.ts`, feedback em `web/haptics.ts` |
| Rede e presença | Salas Colyseus autenticadas por vila, identidade e lease; até quatro participantes | Contratos; implementação de salas não integra este recorte |
| Estado compartilhado | Intenções com identidade/revisões, decisão canônica, recibos e aplicação no safepoint nativo | `shared/world.ts`, `shared/fishing.ts`, `web/world-client.ts` |
| Persistência | Servidor guarda progresso pessoal e estado compartilhado; journal local conserva pendências | Envelope/tipos em `shared/contracts.ts`; `web/checkpoint.ts` e `shared/checkpoint-recovery.ts` |
| Calendário | Hora da autoridade combinada com tempo monotônico no cliente | `web/server-clock.ts` |
| Decoração exterior | Prévia nativa, modelo/collider localizado e colocação/recolha na transação existente | Contrato e aplicação no cliente; produtor nativo e servidor fora deste recorte |

## Caminho de uma interação

1. O input touch ou convencional chega à ação nativa existente/adaptada.
2. A ação produz intenção vinculada à instância, identidade e inventário de
   origem. Uma prévia exterior ainda não consome um item.
3. O cliente conserva contexto, revisão pessoal, revisão do mundo e sequência.
   A sala verifica autenticação e identidade; o servidor valida posse, alcance,
   coordenadas, ocupação e permissão.
4. A mutação canônica atualiza o objeto e o inventário correspondente na mesma
   decisão persistida. Um identificador de operação vincula resultado e recibo.
5. O estado público vai aos participantes; inventário privado vai somente ao
   ator autorizado. O cliente aplica o resultado na ponte nativa.
6. A aplicação nativa precisa confirmar sucesso antes do avanço da sequência.
   Reentrada recebe o estado canônico. O journal local não é uma autoridade
   alternativa para posse ou concessão de recursos.

Esse caminho foi auditado em fonte e observado para decoração no incremento
exterior. Não significa que todas as ações originais tenham a mesma maturidade
de validação. [Relatório e limites](../milestones/2026-10-13-exterior-slice.md).

## Limites do legado e decisões

O inventário nativo tem 15 slots de IDs de 16 bits e condição por slot. O terreno
usa acres e tiles; remover transições visuais não transforma automaticamente
todas as estruturas e colisões em um mundo sem setores. O ator de interior tem
estado global de dono e bancos de cena; ele não foi simplesmente instanciado
no campo para criar decoração exterior.

O primeiro móvel exterior reutiliza geometria e perfil originais mediante
integração localizada. Sua identidade persistente, dono, rotação e revisão
pertencem à aplicação, enquanto ator/render são projeções. Não se ampliaram
structs de save por conveniência nem se criou rede ou banco paralelo.

A autoridade das novas operações não comprova, por si só, a origem de toda
alteração econômica de um checkpoint enviado pelo cliente. Essa limitação
continua explicitamente aberta no [registro de riscos](risk-register.md).

## Proveniência

Checkout nativo de referência:
[`turtlekiosk/slider@cfecc8d4019c7182133b444a671d3b62b42bee44`](https://github.com/turtlekiosk/slider/tree/cfecc8d4019c7182133b444a671d3b62b42bee44).
O commit ancestral exato de ac-decomp ainda não foi confirmado na auditoria.
A integração privada contém trabalho adicional; um link ao upstream não
reconstrói essas alterações nem os inputs locais.

SHA de WASM, ABI, Web e servidor precisam corresponder ao candidato testado.
Evidências de candidatos distintos não são somadas como se fossem uma única
versão concluída. A verificação pública cobre somente os arquivos descritos
em [escopo das fontes](../public-source-scope.md).

## Snapshot de transferência

A composição fechada atual é Native `fc29e6f82c26c626563d` com Web
`circular-ui-icons-only-20261014`. O grafo TypeScript publicado foi alinhado a
esse snapshot, incluindo codecs de fruta, roteamento do protótipo de crafting
e controles de gráficos. Não é uma publicação do servidor/Native completo.
Materiais, sombras e reparos recentes ainda estão isolados. O
[handoff público](../continuation.md) e o [estado atual](../milestones/2026-10-14-current-state.md)
registram integração, provas por candidato e próximos aceites.
