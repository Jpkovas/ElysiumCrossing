# Verificação desta exportação

Executada em 13/10/2026 no subconjunto público. O baseline Node.js 24.11.1 e
o Node.js 26.7.0 local passaram no typecheck e nos mesmos 14 testes. Ferramentas:
TypeScript 5.9.3; tsx 4.23.15; tipos Node 24.19.1. As dependências usadas já
estavam instaladas no workspace pai; uma instalação limpa via `npm ci` ainda
não foi executada neste relatório. O lock conserva registros da instalação
existente, sem copiar os pacotes.

| Verificação | Resultado e alcance |
| --- | --- |
| TypeScript `tsc --noEmit` | Passou sem diagnósticos no grafo público de contratos, WorldClient, checkpoint, clock, haptics e testes |
| `npm test` | 14 testes executados, 14 aprovados, zero falhas, zero ignorados |
| Casos de haptics | 12 casos: padrões, indisponibilidade, ativação, preferência, bordas do motor, gamepad, cancelamento, rejeição/preempção, storage, coalescência e recompensa |
| Casos de relógio | 2 casos: tempo monotônico apesar de mudanças locais e rejeição de hora ausente/inválida |
| Lock de dependências | Grafo declarado lido com `npm ls --package-lock-only --all`, sem pacotes ausentes |
| Manifesto de exportação | Inventário exato e hashes verificados; arquivo adicional e symlink foram rejeitados em provas negativas e removidos |

Os testes são os existentes do projeto, copiados byte a byte. A verificação
estática de WorldClient/checkpoint não executou os transportes ou a recuperação
de gameplay. Nenhum harness de rede ou payload de jogo foi incluído ou rodado.

Os resultados não comprovam vibração no iPhone, FPS, multiplayer completo,
persistência do jogo ou ausência de bugs de UI. Os resultados de gameplay do
incremento exterior estão qualificados em
[relatório separado](milestones/2026-10-13-exterior-slice.md).

As dez fontes publicadas também foram comparadas byte a byte ao snapshot Web
congelado do candidato `0c66814ef9b3191f556d`, sem divergência. O verificador do
manifesto confere o inventário exato e os hashes antes da revisão de
Git/publicação. A publicação e a escolha da licença de reutilização não são
inferidas de testes aprovados.
