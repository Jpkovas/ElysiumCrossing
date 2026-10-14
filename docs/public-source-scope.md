# Escopo das fontes públicas

Exportação explícita do progresso local, atualizada em 14/10/2026. A raiz de desenvolvimento
contém código próprio da aplicação; o checkout de terceiros fica em `client/`.
Nenhum arquivo desse checkout foi copiado nesta exportação. O manifesto registra
origem relativa, tamanho e hash de cada arquivo incluído.

## Código incluído

| Caminho | Responsabilidade | Integrações fora desta árvore |
| --- | --- | --- |
| `shared/world.ts` | Intenções, objetos exteriores, inventário e snapshots/commits | Validação e armazenamento do servidor; consumidor nativo |
| `shared/fishing.ts` | Tipos de estados e operações de pesca compartilhada | Simulação/validação, tabelas e consumidor nativo |
| `shared/contracts.ts` | Contrato comum Web/API/sala/ponte C; envelope de checkpoint, orçamento de raster aceito e seleção de ferramentas | Implementação nativa, API e sala |
| `shared/checkpoint-recovery.ts` | Representação canônica de identidade da captura/recibo | Autoridade e produtor do checkpoint |
| `web/world-client.ts` | Validação de mensagens e aplicação de mundo/inventário via safepoint | Socket autenticado, autoridade e NativeGame concretos |
| `web/checkpoint.ts` | Envelope, leitura do par, identidade e journal de checkpoint | Arquivos da instância e transporte concretos |
| `web/server-clock.ts` | Hora de servidor com elapsed monotônico | Resposta autenticada do servidor |
| `web/haptics.ts` | Preferência, ativação, padrões sutis e cancelamento | APIs reais do navegador/dispositivo |
| `web/private-assets.ts` | Allowlist de rotas, autorização online, verificação de integridade e cache limitado de assets | Endpoints autenticados, manifestos e arquivos privados reais |
| `tests/haptics.test.ts` | Casos controlados de vibração, capacidades e cancelamento | Não comprova vibração física |
| `tests/server-clock.test.ts` | Calendário sob mudança do relógio local e dados inválidos | Não executa crescimento no jogo |

As onze fontes acima são cópias byte a byte dos seus snapshots de origem.
`shared/contracts.ts` e `web/private-assets.ts` correspondem ao snapshot Web
congelado `circular-ui-icons-only-20261014`, ligado ao Native
`fc29e6f82c26c626563d`. As nove fontes anteriores preservam o snapshot
`0c66814ef9b3191f556d`; elas não foram substituídas para aparentar uma integração
completa. O manifesto registra a origem por arquivo. O relatório de decoração
histórico continua vinculado ao candidato `6d79af919605cb14f133`.
Não houve stubs novos, adaptação de API para esconder módulos ausentes ou
reimplementação de gameplay.
O grafo está fechado para typecheck; imports relativos resolvem somente para
arquivos incluídos. Os dois testes públicos existentes usam dados sintéticos
gerados pelo código de teste e não contêm save, dump ou fixture extraída.

O carregador contém nomes finitos de rotas e IDs de itens, mas nenhum pixel,
modelo, tabela de glifos, manifesto privado, hash de atlas ou arquivo do jogo.
As constantes de formato do contrato já fazem parte da interface própria da
aplicação; não são um payload de save observado.

## Dependências declarativas

`package.json` declara ferramentas de desenvolvimento; `package-lock.json`
conserva seus registros e integridades da instalação local já utilizada.
Nenhum código ou pacote de terceiros está vendorizado. A licença de cada
dependência continua sendo a do seu autor: `tsx`/tipos Node e dependências MIT,
TypeScript Apache-2.0. Essas ferramentas não fornecem assets do jogo.

Não foi criada uma licença nova para o projeto por inferência. A disponibilização
do progresso foi autorizada pelo proprietário do projeto; a escolha de uma
licença de reutilização para o código próprio permanece distinta dessa ação.

## Exclusões obrigatórias

- `client/` completo: decomp, port e bibliotecas de terceiros; inclui recursos
  embutidos em C e arquivos cuja procedência ainda exige revisão individual.
- Dump e derivados: ROM, executáveis, modelos, texturas, áudio, tabelas e textos
  extraídos do jogo, inclusive quando transformados em `.ts`, `.json` ou `.c`.
- `shared/ui-font.ts`, que contém tabelas extraídas; `shared/ui-hand.ts`, ligado
  ao manifesto privado de captura; atlas, capturas e consumidores da roda que
  dependem desses recursos. O incremento visual é documentado, sem publicar um
  componente incompleto ou criar substitutos para encobrir as exclusões.
- Saves, checkpoints, passaportes, bancos, payloads de observação e fixtures
  geradas com dados do jogo. Relatórios públicos conservam apenas resultados
  e identificadores do candidato, sem dados pessoais ou conteúdo de save.
- Certificados/chaves, sessões, convites, credenciais, arquivos de ambiente,
  logs de rede e configuração privada do ambiente local.
- `server/data/`, `server/native-world-layout.ts`, recursos observados ou
  gerados e dependências vendorizadas.
- O restante de Native/backend/Web permanece na integração privada até revisão
  de origem por arquivo. A ausência desses módulos não decorre apenas de assets
  faltantes; este recorte não reconstrói nem inicia o jogo completo.

## Verificação antes do envio

`npm run verify:export` confere o inventário exato e os hashes do manifesto,
rejeita arquivos adicionais, symlinks, conteúdo binário e extensões privadas.
Essa verificação mecânica não substitui a revisão de autoria/licença. O root
da execução faz a revisão final da árvore e do estado remoto antes de commit
e push. O workspace privado e seus dados ficam preservados.
