# Registro de riscos

Revisão pública de 13/10/2026. Riscos descrevem lacunas concretas da integração;
não são gates genéricos de aprovação.

| Risco | Evidência / impacto | Tratamento e prova que falta |
| --- | --- | --- |
| Dono global do quarto | Ator e bancos de interior têm pressupostos globais | Render/collider exterior localizados; regressão da casa, luz, câmera e editor |
| Posse duplicada | Item de bolso e objeto exterior podem divergir | Uma decisão canônica publica inventário e ocupação juntos; conferir conflito e conservação |
| Concorrência de ocupação | O fluxo possui identidade de operação e revisão; isso não basta como prova de corrida real | Duas tentativas válidas na mesma célula devem produzir uma ocupação definitiva |
| Visual e colisão divergentes | Cache visual distante não ativa todos os atores/colisões | Comparar footprint do servidor e collider nativo com movimento real |
| Estruturas fixas do save | IDs, slots, condições e estruturas do legado possuem limites | Não ampliar offsets/arrays sem trace dos consumidores e prova de integridade |
| Confiança em checkpoint | Um envelope aceito não atesta toda origem econômica do conteúdo | Não afirmar solução global por remover importação pública; novas operações preservam validação canônica |
| Desconexão e estado pendente | Autosave e journal existem, mas cada novo domínio precisa participar corretamente | Reentrada deve restaurar a decisão definitiva; validação ainda delimitada por candidato |
| Memória e desempenho | Testes simultâneos chegaram a pressionar memória do ambiente local | Poucas instâncias, perfis sequenciais e comparação com baseline; ciclos nativos não são FPS apresentados |
| Evidência de versões diferentes | Native/Web/servidor e ABI mudam durante desenvolvimento | Fechar conjunto físico de artefatos e não declarar conclusão combinando candidatos |
| Licença e origem | Licença de código aberto não inclui assets extraídos de jogo | Exportação explícita por arquivo, manifesto e revisão antes do envio |
| Relógio e recompensas | Relógio do dispositivo pode ser manipulado | Hora do servidor com elapsed monotônico; concessão por fatos e evento individual |
| NPCs e terreno | Rotinas e navegação dependem de estruturas legadas ainda não totalmente auditadas | Pequena expansão de rotina e POC isolada antes de editores amplos |
| Escopo sem convergência | Modernização inclui mais que interfaces e port | Entregar marcos integrados; manter crafting/social/jardinagem/terreno no backlog ativo |

O teste físico de iPhone foi dispensado como requisito de conclusão pelo
usuário. Isso não transforma testes em perfil mobile no Mac em evidência de
vibração ou desempenho físico do iPhone.
