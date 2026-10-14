# Verificação da exportação de 14/10/2026

Executada sobre a árvore pública com Node.js 24.11.1, npm 11.16.0,
TypeScript 5.9.3, tsx 4.23.15 e tipos Node 24.19.1. A instalação limpa
`npm ci --ignore-scripts` passou pelo lockfile, sem scripts de instalação.
Não foi atualizado o conjunto de dependências para esta exportação.

| Verificação | Resultado e alcance |
| --- | --- |
| Instalação limpa | Passou; dependências declaradas instaladas sem código vendorizado no commit |
| `npm run typecheck` | Passou, sem diagnósticos no grafo público atualizado |
| `npm test` | 14 testes executados, 14 aprovados, zero falhas ou ignorados |
| Haptics | 12 casos: padrões, ativação, preferência, bordas do motor, gamepad, cancelamento, rejeição, storage, coalescência e recompensa |
| Relógio | 2 casos: tempo monotônico sob mudanças locais e rejeição de hora inválida/ausente |
| `node --check` | Passou para as duas ferramentas de release |
| Lock declarativo | `npm ls --package-lock-only --all` sem dependências ausentes |
| Manifesto e árvore | Inventário, bytes e SHA verificados antes do commit; índice e árvore precisam corresponder antes do push |

As fontes/testes TypeScript publicados correspondem byte a byte ao snapshot
Web atual. As ferramentas de release correspondem às suas unidades próprias
fechadas. Os testes controlados não contêm saves ou fixtures extraídas.

As ferramentas operacionais têm verificações privadas anteriores: 8 casos
focais de snapshot/restore e 11 de configuração/preparação. Esses testes não
fazem parte da suíte pública, pois exigem backend, providers ou fixtures que
não podem acompanhar a exportação. Não foram substituídos por mocks ou stubs.
O snapshot/restore real tem um resultado local documentado, distinto de jogar
sobre a restauração. O preparador não iniciou serviço, túnel ou deploy.

O typecheck não executa `WorldClient`, protocolos ou aplicação Native. O teste
de relógio não valida crescimento e haptics não prova vibração no iPhone.
Nenhum teste de rede excluído, serviço, save ou browser foi operado para este
push. As evidências anteriores de gameplay e suas versões estão descritas no
[estado consolidado](milestones/2026-10-14-current-state.md).
