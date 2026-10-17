> Registro de planejamento anterior. A base vigente e a ordem de retomada estão
> em [continuation.md](../continuation.md), atualizado em 17/10/2026.

# Escopo ativo da modernização

Síntese do plano técnico incorporado em 12/10/2026. A missão é modernizar
progressivamente o port existente de Animal Crossing GameCube, usando
funcionalidades de New Horizons como referência, sem substituir o motor ou
descartar mobile, rede e persistência já implementados.

## Diretrizes

- Auditar o workspace antes de refatorar; o código existente tem precedência
  sobre sugestões conceituais ainda não verificadas.
- Reutilizar ações e sistemas do GameCube, ampliando-os em incrementos pequenos
  que funcionem do input à atualização do mundo e à persistência.
- Touch e controle adaptado acionam as mesmas regras de gameplay. Interface
  mobile first, retrato primeiro, com identidade audiovisual Animal Crossing.
- UI e prévia são locais; a autoridade existente valida mutações compartilhadas.
  Uma transação resolve posse, ocupação, inventário e resultado persistente.
- Remover caminhos obsoletos em vez de criar compatibilidade, fallbacks ou
  migrações. Preservar dados e trabalho não relacionado durante a execução.
- Pesquisar por pergunta concreta: implementação atual, GameCube, comportamento
  oficial de NH e ferramentas públicas precedem engenharia reversa direcionada.
- Separar evidência confirmada, documentada, observada e hipótese. Nunca tratar
  compilação ou testes de mocks como confirmação de um fluxo de jogador.
- Assets proprietários e dados extraídos permanecem locais. Revisar origem e
  licença de cada conteúdo antes da publicação.

## Entregas

| Marco | Entrega e limite |
| --- | --- |
| 0 | Auditoria da arquitetura, paridade, riscos e backlog sem sistemas duplicados |
| 1 | Um móvel exterior selecionável, com prévia, validação, colocação/recolha, dois clientes e persistência |
| 2 | Inventário moderno, regras por tipo, organização e atalhos de ferramentas |
| 3 | Receitas, desbloqueio, validação, consumo e resultado de crafting seguros |
| 4 | Expansão social integrada à rede e às animações existentes |
| 5 | Jardinagem/progressão persistentes, com regras e recompensas verificáveis |
| 6 | Estudo de terreno e prova de conceito de uma célula; alternativa justificada se a arquitetura exigir mudanças excessivas |

Personalização de móveis, rotinas de NPCs e infraestrutura entram no backlog
conforme dependências e valor. A meta não exige trocar a base por New Horizons
ou reproduzir todo seu catálogo. O plano original do port e seus problemas
pendentes continuam ativos. Apenas WhatsApp fica para depois.

## Conclusão de cada marco

Exige funcionalidade operacional, testes relevantes, multiplayer observado,
persistência verificada, ausência de regressões relevantes no mobile,
documentação atual e nenhuma duplicação arquitetural desnecessária. Relatórios
registram candidato, mecanismos reaproveitados, decisões, evidências, limites
e o menor próximo incremento útil.
