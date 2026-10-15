# Verificação da exportação de 15/10/2026

Executada sobre uma cópia limpa da árvore pública (sem `node_modules` nem
`.git`) com Node.js 24.11.1, npm 11.16.0, TypeScript 5.9.3 e tsx 4.23.15.
`npm ci --ignore-scripts` instalou pelo lockfile, sem scripts de instalação.
O conjunto de dependências não mudou nesta exportação.

| Verificação | Resultado e alcance |
| --- | --- |
| Instalação limpa | Passou; nenhum código de dependência no commit |
| `npm run typecheck` | Passou, sem diagnósticos, com o `shared/contracts.ts` da candidata `b75becf` |
| `npm test` | 14 testes executados, 14 aprovados, zero falhas ou ignorados |
| `node --check` | Passou para as duas ferramentas de release |
| Lock declarativo | `npm ls --package-lock-only --all` sem dependências ausentes |
| Manifesto e árvore | `node tools/verify-public-export.mjs` passou antes do commit; blobs e modos do índice conferidos contra o manifesto antes do push |

`shared/contracts.ts` é cópia byte a byte da árvore `b75becf`; as demais fontes
TypeScript publicadas são idênticas a essa árvore e não mudaram. Os testes
públicos não contêm saves nem fixtures extraídas.

O typecheck não executa `WorldClient`, protocolos ou o Native. A evidência de
gameplay da candidata está no [marco](milestones/2026-10-15-lote-c.md), descrita
por build, sem capturas, payloads ou dados privados. Nenhum serviço, save,
banco ou navegador foi operado para este push.
