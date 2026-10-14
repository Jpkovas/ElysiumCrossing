# Estado de desenvolvimento — 14/10/2026

Este relatório registra o estado local no momento da transferência de trabalho.
O repositório público conserva um recorte revisado do código próprio e sua
documentação; **não contém uma distribuição executável do jogo**. Uma entrega
publicada como fonte não significa que todos os seus caminhos foram exercitados
no navegador. Os limites de redistribuição estão em
[Escopo das fontes públicas](../public-source-scope.md).

## Candidato de referência

A última composição fechada usa Native `fc29e6f82c26c626563d` e Web
`circular-ui-icons-only-20261014`. Foram conferidos os 73 artefatos dessa
composição local. Executáveis, recursos e manifestos privados não acompanham
esta publicação.

A roda de ferramentas circular sem legendas foi aprovada visualmente e
verificada dentro do jogo em retrato, paisagem e desktop. Usa os ícones do
bolso, um ícone próprio de Mãos livres e poses da mão original. A mão preserva
as facetas do modelo; contato com a borda de uma captura não comprovou corte
de geometria. A apresentação segue o fator de raster aceito pelo Native em
1x/2x/3x, sem multiplicá-lo pelo DPR, mantendo nomes acessíveis e alvos touch.

O candidato ainda conserva o **protótipo legado de crafting com três maçãs**.
Essa receita foi rejeitada pelo usuário e não representa o comportamento final.
O snapshot literal não foi reescrito para aparentar uma integração posterior.
A substituição prevista é o barril com cinco madeiras e dois ferros; coleta,
materiais, suas regras e o novo caderno ainda precisam convergir no executável.

## Evidências já obtidas

| Entrega | Resultado observado | Limite |
| --- | --- | --- |
| Equipar e Mãos livres no `fc29` | A UI equipou uma ferramenta, guardou-a uma vez e conservou inventário e recursos; checkpoint conferido contra o estado canônico | Não comprova todas as ferramentas ou novas ações remotas |
| Roda e raster no `fc29` | Três proporções, guardas de entrada e ciclo real 1x → 2x → 3x → 2x → 1x; versão final sem legendas conferida separadamente | A remoção de legendas foi Web; Native e backend foram preservados |
| Visita multiplayer no candidato anterior `63b` | Viagem normal, encontro, movimento, chat bilateral, móvel visto por ambos, proteção contra recolha por visitante, coleta de fruta e retorno com progresso | Não comprova suavidade de toda animação, ferramentas remotas ou toda disputa por recursos |
| Bloqueio offline e retomada no `63b` | Cliente sem conexão não continua jogando; retomada conservou o mesmo jogo e os recursos | Não simula queda do processo do servidor ou do serviço Cloudflare |
| Tutorial mínimo | Fluxo inicial, pagamento, saída e reabertura com checkpoints íntegros e recursos conferidos | Não cobre todos os ramos; journal direto do navegador não foi observado nessa rodada |
| Backup e restore reais | 23 tabelas e 7.064 blobs referenciados conferidos; cópia independente e integridade preservadas | O restore não foi iniciado como nova sessão de jogo |
| Preparação de release | Leitores reais validaram o pacote fechado e os providers correspondentes | Nenhum túnel, domínio ou serviço público do jogo foi iniciado |

As provas de gameplay vieram do ambiente privado de desenvolvimento. Este
relatório publica os resultados agregados, sem saves, capturas, payloads,
sessões ou dados de conta. Os testes públicos estão descritos em
[Verificação](../verification.md); eles não substituem essas provas nem fecham
os aceites de lançamento por si só.

## Alterações que ainda não estão no candidato

| Frente | Estado real | Próxima entrega |
| --- | --- | --- |
| Materiais e crafting | Código e verificações focais de coleta, pilhas, ícones, nomes, desenho no mundo e autoridade; partes fechadas e outras ainda em revisão. Emissão desabilitada no candidato | Fechar ações de inventário, drop/pickup e correção do último golpe; compor os contratos e verificar o fluxo real |
| Caderno de receitas | Contratos e providers técnicos preservados; desenho que reutilizava a roda foi rejeitado | Inspecionar referências, gerar novo conceito com ImageGen em base própria e implementar conforme o alvo escolhido; essa geração ainda não ocorreu |
| Editor de desenhos | Diagnóstico confirmou alteração de reserva de HUD durante o traço e categoria visual que não confirma a ferramenta ativa | Implementar os reparos e verificar precisão, tamanho estável e ferramentas no executável; os testes do diagnóstico não são prova do reparo |
| Fundo do botão da roda | Correção CSS localizada preparada e conferida em fixture | Concluir revisão e compor no Web; falta conferência dentro do jogo |
| Sombras remotas e de mobiliário | Alteração Native em andamento, com testes C focais | Fechar revisão, compor e conferir renderer, terreno e dois clientes; ainda sem prova GPU integrada |
| Animação e ferramentas remotas | Relatos humanos de travadas/piscadas, ferramenta segurada ausente e ações não visíveis | Investigar contrato, interpolação e desenho existentes; a causa das piscadas não foi confirmada |
| Recolha externa | Já existe ação de recolher, dependente de posse, alcance, espaço e contexto; usuário não encontrou um caminho utilizável | Distinguir móvel posicionado, item largado e vila visitada; corrigir affordance sem remover permissões |

O progresso de uma frente não autoriza substituir arquivos compartilhados
inteiros. Sombras e apresentação remota dividem a bridge Native; materiais
dividem contratos, inventário e autoridade. A integração precisa preservar as
alterações de cada região e medir a ABI do Native resultante.

## Primeira build para amigos

Esta é a prioridade de entrega, enquanto a modernização continua em paralelo.
Os sete aceites seguem abertos como conjunto; as provas parciais acima devem
ser preservadas enquanto seus caminhos não forem alterados.

| Aceite | O que falta fechar |
| --- | --- |
| Acesso e publicação | Link HTTPS Cloudflare real, login convidado e proteção dos recursos privados validados nesse endereço |
| Primeiro passeio | Rodada curta dos fluxos essenciais de conta nova e correções dos defeitos concretos de touch e menus |
| Multiplayer | Recorte final da release, apresentação remota e confirmação dos caminhos compartilhados afetados |
| Progresso e autoridade | Cobrir as lacunas de falha real de serviço e recuperação; preservar autosave, isolamento e bloqueio offline |
| Gameplay compartilhado | Pesca natural com resultado durável e disputa por uma fruta no jogo; esses dois cenários ainda não foram executados na rodada agendada |
| Estabilidade e dispositivos | Sessão estável no perfil básico, retrato/paisagem/desktop e capacidade suportada explícita; iPhone físico foi dispensado como gate |
| Operação | Supervisão, armazenamento persistente, início sobre restore, instruções de acesso e atualização reversível |

Não há afirmação de prontidão de produção ou jogo público neste marco. A
publicação das fontes é distinta da implantação do jogo, que continua pendente.

## Escopo completo preservado

O plano original e os marcos 0–6 de modernização continuam ativos: auditoria,
decoração externa, inventário e atalhos, crafting, interações sociais,
jardinagem/progressão e estudo com prova de conceito de terreno. A primeira
build para amigos não exige concluir toda a modernização, mas não a cancela.
Somente WhatsApp está adiado. O estudo de terreno não é terraformação jogável;
personalização inicial e sistemas sociais também têm lacunas de integração.

Para a retomada, leia o [handoff público de continuidade](../continuation.md)
e o [roadmap de implementação](../modernization/implementation-roadmap.md).
