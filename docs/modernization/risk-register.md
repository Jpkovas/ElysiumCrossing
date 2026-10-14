# Registro de riscos

Revisão pública de 14/10/2026. Riscos representam lacunas concretas, não
procedimentos genéricos de aprovação.

| Risco | Evidência / impacto | Tratamento e prova restante |
| --- | --- | --- |
| Editor instável | Layout muda durante stroke e coordenadas podem divergir; seleção não garante ferramenta ativa | Estabilizar reserva/transformação e confirmar ferramenta no Native; diagnóstico não é fix |
| Apresentação remota | Usuário relata animação piscando, sem item segurado nem ação de ferramenta | Traçar snapshot, interpolação, keyframes e desenho, reutilizando transporte |
| Recolha exterior | Caminho existente exige contexto, alcance, bolso e permissão; usuário não encontra ação | Separar móvel colocado de item solto e visitante de dono; não remover proteção |
| Sombras | Jogador remoto e móveis exteriores sem sombra suficiente | Incremento localizado ainda precisa integração e captura real |
| Mistura de candidatos | Código fechado, WIP e ABI têm origens diferentes | Composição por região, contratos e pins; nova ABI para Native alterado |
| Materiais e receita | Protótipo com maçãs rejeitado ainda no pacote; substituição isolada | Integrar obtenção, consumo, drop/pickup e conservação atomicamente |
| Concorrência | Intenção/revisão não comprova toda disputa em jogo | Mesmo recurso/célula deve gerar uma decisão definitiva, sem duplicar |
| Estado de interior | Atores e bancos possuem pressupostos globais | Regressão de casa, luz, câmera, editor e consumo de input |
| Confiança em checkpoint | Aceitar envelope não comprova toda origem econômica | Preservar autoridade e invariantes; não declarar solução global por um reparo |
| Queda e retomada | Offline do cliente foi observado, queda do processo/Cloudflare não | Validar recorte final e impedir gameplay sem autoridade |
| Operação/restauração | Restore de dados íntegro; jogo não iniciado sobre ele | Boot isolado, sessão e progresso após restauração |
| Memória/performance | Pressão de memória observada no Mac | Limitar instâncias e usar baseline; ciclos não equivalem a FPS apresentados |
| Propriedade intelectual | Fonte de port e dados podem conter conteúdo de terceiros | Exportação explícita revisada; excluir recursos e origem inconclusiva |
| Terreno/NPCs | Cache visual não resolve lifecycle, colisão e navegação | POC localizada antes de editor amplo |
| Escopo | Port e build inicial não encerram modernização | Preservar marcos 0–6, aceites observáveis e documentação atual |

O iPhone físico foi dispensado como requisito de conclusão. Isso não transforma
perfil mobile no Mac em prova de vibração ou desempenho do aparelho.
