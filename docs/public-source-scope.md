# Escopo das fontes públicas

Exportação curada de 14/10/2026. O workspace de desenvolvimento contém a
aplicação própria e uma base Native de terceiros. Esta árvore publica somente
fontes próprias revisadas, metadados declarativos e documentação sanitizada.
Não é uma cópia completa do workspace nem um backup do jogo.

## Código publicado

| Arquivo | Responsabilidade | Dependências privadas ou limites |
| --- | --- | --- |
| `shared/world.ts` | Intenções, inventário, objetos e commits | Autoridade e consumidor Native concretos |
| `shared/fishing.ts` | Contratos da pesca compartilhada | Simulação, regras e consumidor concretos |
| `shared/contracts.ts` | Contratos Web/API/Native, checkpoint, raster e ferramentas | Implementações concretas |
| `shared/checkpoint-recovery.ts` | Identidade canônica de captura e recibo | Produtor e autoridade do checkpoint |
| `shared/fruit-stack.ts` | Codec próprio e operações de quantidade | Persistência e consumidores Native/servidor |
| `shared/item-icons.ts` | IDs finitos e tipos do mapeamento de ícones | Nenhum sprite, atlas ou manifesto real incluído |
| `shared/crafting.ts` | Contrato literal do protótipo presente no candidato | Receita com maçãs rejeitada; não é crafting final |
| `web/world-client.ts` | Validação e aplicação de mundo/inventário no safepoint | Sala autenticada, autoridade e Native concretos |
| `web/checkpoint.ts` | Envelope, par, identidade e journal | Arquivos da instância e transportes concretos |
| `web/private-assets.ts` | Rotas autorizadas, integridade e cache limitado | Manifestos e arquivos reais ficam privados |
| `web/hd-textures.ts` | Indexação, pedidos, cancelamento e ponte de texturas HD | Nenhuma textura, DDS ou catálogo real incluído |
| `web/graphics-settings.ts` | Controles e preferências de resolução/HD | Runtime e CSS concretos; visual não redesenhado neste envio |
| `web/server-clock.ts` | Hora do servidor com elapsed monotônico | Resposta autenticada da autoridade |
| `web/haptics.ts` | Ativação, preferências, padrões e cancelamento | APIs reais do navegador/dispositivo |
| `tests/haptics.test.ts` | 12 casos controlados de haptics | Não comprova vibração física |
| `tests/server-clock.test.ts` | 2 casos controlados de relógio | Não executa crescimento no jogo |
| `tools/release/store-snapshot.mjs` | Snapshot e restauração de store em destino novo | Exige leitores do backend privado correspondente |
| `tools/release/prepare.mjs` | Validação e preparação local de pacote/configuração | Exige pacote fechado e providers privados; não faz deploy |

As 16 fontes TypeScript/testes são cópias byte a byte do snapshot Web
`circular-ui-icons-only-20261014`, ligado ao Native `fc29e6f82c26c626563d`.
As duas ferramentas operacionais são cópias integrais das unidades próprias
revisadas depois desse snapshot; não são apresentadas como parte do runtime
congelado. O manifesto registra tamanho, SHA-256 e origem por arquivo.
Não foram criados stubs ou adaptações de gameplay para esconder módulos ausentes.

O grafo de imports está fechado para typecheck. A presença dos contratos não
significa que o servidor, a simulação Native ou a UI completa foram publicados.
O novo `WorldClient` exige os hooks de crafting e `learnedRecipes` do candidato
atual; não foi adicionada compatibilidade com snapshots antigos.

A receita experimental com maçãs permanece somente porque esta é uma cópia
literal do candidato fechado. Ela foi rejeitada para a experiência final.
Madeira/ferro e a receita pretendida estão em trabalho isolado; não foram
substituídos em fonte pública para aparentar uma integração ainda inexistente.

## Origem e limites dos recursos

IDs finitos, codecs, tipos, rotas e os pins de integridade no preparador são
lógica/metadados da aplicação. Não carregam pixels, modelos, tabelas de glifos,
payload de save, credenciais ou os arquivos privados identificados pelos hashes.
As ferramentas recebem inputs locais explicitamente; seus outputs são privados.

O `package.json` e o lockfile declaram ferramentas existentes. Nenhuma biblioteca
ou código de terceiros foi vendorizado. TypeScript conserva Apache-2.0; tsx,
tipos Node e suas dependências conservam seus próprios termos. Não se inferiu
uma licença de reutilização para o código próprio pela autorização de publicação.

## Exclusões

- `client/` completo, port/decomp e deltas Native sem revisão individual.
- Dump, ROM, executáveis, modelos, texturas, áudio, textos e dados extraídos,
  mesmo quando codificados em `.ts`, `.json` ou `.c`.
- Fonte extraída, tabelas de glifos, atlas, sprites, manifestos privados da mão,
  capturas e consumidores da UI que dependem dessas famílias.
- `server/data/`, layouts gerados, saves, checkpoints, passports, NES, bancos,
  backups e fixtures/payloads observados durante jogo.
- Credenciais, convites, sessões, certificados, chaves, ambiente local e logs.
- Handoff privado, índice de pins e registros de equipe/ambiente completos.
- Testes operacionais que dependem de backend/providers/fixtures privados.
- Dependências vendorizadas, builds e a integração completa ainda não revisada.

## Verificação do envio

`npm run verify:export` confere inventário exato, bytes e hashes. Rejeita extras,
symlinks, binários e extensões privadas. Não substitui revisão de autoria,
conteúdo ou licença. Antes do push, os blobs e modos do índice e da árvore do
commit são comparados separadamente ao mesmo manifesto. O SHA remoto é
confirmado depois do envio. O workspace de integração permanece preservado.
