> Registro de planejamento anterior. A base vigente e a ordem de retomada estão
> em [continuation.md](../continuation.md), atualizado em 17/10/2026.

# Roadmap e critérios de lançamento

Revisão pública de 14/10/2026. O [plano completo](plan-v1.md) continua ativo.
A primeira build para amigos tem prioridade de entrega, em paralelo à
modernização. Apenas WhatsApp fica para uma etapa posterior.

## Primeira build para amigos

Nenhum dos sete aceites abaixo foi declarado integralmente encerrado. Evidência
válida de caminhos inalterados deve ser preservada; executar novamente apenas
mudanças, dependências afetadas e lacunas concretas.

| Frente | Prova existente | Falta para liberar |
| --- | --- | --- |
| Acesso HTTPS | Autenticação local e pacote/providers inspecionados | Endereço/túnel real, acesso autorizado e negativos no link final |
| Primeiro passeio | Tutorial mínimo, pagamento, saída/reabertura | Lacunas do tutorial, touch essencial e journal observado |
| Multiplayer | Visita normal, encontro, chat bilateral, móvel, permissões e retorno no 63b | Suavidade, itens/ferramentas remotos e recorte final |
| Progresso/autoridade | Autosave e offline/retomada do cliente | Queda do processo, reentrada e isolamento no ambiente de release |
| Gameplay compartilhado | Fruta coletada com resultado durável | Captura natural de peixe e disputa ordinária pelo mesmo recurso |
| Estabilidade | Roda em três proporções; baseline de baixo custo para QA | Editor de desenhos, controles essenciais, sessão estável e capacidade publicada |
| Operação | Ferramentas de preparação; backup/restore reais íntegros | Jogar sobre restore, supervisão, instruções e procedimento de atualização |

O preparador não implantou o jogo. A publicação do código e do relatório não
constitui deploy. O teste físico de iPhone foi dispensado como requisito.

## Modernização ativa

| Marco | Estado atual | Menor próxima entrega |
| --- | --- | --- |
| 0 / MOD-000–001 | Auditoria inicial e docs; proveniência exata da base/CI com lacunas | Manter código/candidato/evidência alinhados e revisar fontes para publicação |
| 1 / MOD-010–013 | Slice exterior observado e sincronizado; aceites complementares abertos | Recolha compreensível, conflito e regressão interior delimitados |
| 2 / MOD-020–022 | Inventário adaptado, pilhas de fruta e roda funcional | Corrigir editor e compor regras de materiais/transferências |
| 3 / MOD-030–031 | Protótipo econômico presente; receita rejeitada; materiais em Source isolado | Compor madeira/ferro e receita pesquisada; caderno com base própria |
| 4 / MOD-040 | Reações e presença existentes; expansão parcial | Corrigir apresentação remota e fechar interrupção/cancelamento |
| 5 / MOD-050–051 | Plantio, crescimento, eventos e frentes isoladas | Regra persistente e recompensa por fato confirmado, sem concessão duplicada |
| 6 / MOD-060–062 | Estudo/POC isolada de terreno e continuidade | Prova pequena de terreno com visual, colisão, navegação e persistência |

## Ordem de continuidade

1. Preservar o pacote fechado e WIP; conferir o estado real dos ambientes.
2. Corrigir bugs de input/editor/fundo e apresentação multiplayer sem um
   redesenho especulativo ou troca de arquitetura.
3. Compor materiais por regiões e contratos, medindo ABI de qualquer Native
   novo; não substituir módulos inteiros que têm sobreposição.
4. Fechar os fluxos restantes do lançamento com o menor roteiro relevante.
5. Preparar acesso e operação por HTTPS, validar e publicar a build somente
   dentro da autorização correspondente; manter marcos 0–6 em paralelo.

Toda UI nova ou redesenhada exige referência GameCube e referência funcional
NH, conceito ImageGen, alvo definido, implementação e comparação no artefato
real. Caderno tem composição própria; não reutiliza o desenho da roda.
Fonte/ícones/raster/input podem ser compartilhados, com alvos touch e ARIA.
Polimento sem impacto funcional não bloqueia sozinho o primeiro lançamento.
