# Escopo das fontes públicas

Exportação explícita do progresso local em 13/10/2026. A raiz de desenvolvimento
contém código próprio da aplicação; o checkout de terceiros fica em `client/`.
Nenhum arquivo desse checkout foi copiado nesta exportação. O manifesto registra
origem relativa, tamanho e hash de cada arquivo incluído.

## Código incluído

| Caminho | Responsabilidade | Integrações fora desta árvore |
| --- | --- | --- |
| `shared/world.ts` | Intenções, objetos exteriores, inventário e snapshots/commits | Validação e armazenamento do servidor; consumidor nativo |
| `shared/fishing.ts` | Tipos de estados e operações de pesca compartilhada | Simulação/validação, tabelas e consumidor nativo |
| `shared/contracts.ts` | Contrato comum Web/API/sala/ponte C; envelope de checkpoint | Implementação nativa, API e sala |
| `shared/checkpoint-recovery.ts` | Representação canônica de identidade da captura/recibo | Autoridade e produtor do checkpoint |
| `web/world-client.ts` | Validação de mensagens e aplicação de mundo/inventário via safepoint | Socket autenticado, autoridade e NativeGame concretos |
| `web/checkpoint.ts` | Envelope, leitura do par, identidade e journal de checkpoint | Arquivos da instância e transporte concretos |
| `web/server-clock.ts` | Hora de servidor com elapsed monotônico | Resposta autenticada do servidor |
| `web/haptics.ts` | Preferência, ativação, padrões sutis e cancelamento | APIs reais do navegador/dispositivo |
| `tests/haptics.test.ts` | Casos controlados de vibração, capacidades e cancelamento | Não comprova vibração física |
| `tests/server-clock.test.ts` | Calendário sob mudança do relógio local e dados inválidos | Não executa crescimento no jogo |

As dez fontes acima são cópias byte a byte do workspace e foram comparadas ao
snapshot Web congelado usado pelo candidato `0c66814ef9b3191f556d`: todas são
iguais. Isso fixa a procedência técnica da exportação; o relatório de decoração
histórico continua vinculado ao seu próprio candidato `6d79af919605cb14f133`.
Não houve stubs novos,
adaptação de API para esconder módulos ausentes ou reimplementação de gameplay.
O grafo está fechado para typecheck; imports relativos resolvem somente para
arquivos incluídos. Os dois testes públicos existentes usam dados sintéticos
gerados pelo código de teste e não contêm save, dump ou fixture extraída.

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
