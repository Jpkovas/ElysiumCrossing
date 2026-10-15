# Continuidade de implementação

Este é o handoff público do estado de 14/10/2026, com a candidata de 15/10
registrada em [marco da candidata](milestones/2026-10-15-lote-c.md). Ele explica o que preservar
e a ordem de integração, sem transportar o ambiente privado. Consulte primeiro
o [estado atual](milestones/2026-10-14-current-state.md), a
[arquitetura](modernization/architecture-baseline.md), a
[paridade funcional](modernization/feature-parity.md), o
[roadmap](modernization/implementation-roadmap.md) e o
[escopo das fontes públicas](public-source-scope.md).

## O que este repositório permite continuar

A publicação contém código próprio selecionado, contratos e documentação.
Ela **não reconstrói nem inicia o jogo completo**. A ausência de componentes
não decorre apenas de arquivos de mídia: a integração Native, partes do
backend e Web e seus providers ainda dependem de revisão de origem por arquivo
ou de material privado. Não adicionar stubs, caminhos alternativos ou APIs
incompatíveis para fingir que o recorte é um produto executável.

Dump, executáveis, textos e tabelas extraídos, modelos, texturas, áudio, fonte,
ícones, atlas e poses da mão permanecem fora desta árvore. Também ficam fora
saves, checkpoints, bancos, certificados, credenciais, sessões e registros
privados de execução. Bibliotecas e ferramentas conservam suas licenças;
nenhum código de terceiros deve ser incorporado por mera disponibilidade.
Não foi atribuída uma licença nova ao projeto por inferência.

A continuidade completa exige acesso autorizado ao workspace privado e seus
contratos de integração. Este documento não substitui o handoff local com
artefatos e evidências detalhadas, que não deve ser copiado indiscriminadamente
para o repositório público.

## Base que deve ser preservada

A candidata local é a árvore `b75becf` com Native `452e50a30e467588df6e`,
sobre a roda sem legendas aprovada (Native anterior `fc29e6f82c26c626563d`,
Web `circular-ui-icons-only-20261014`). Ela já integra sombras, editor de
desenhos, fundo do botão da roda, perfil gráfico básico, avatar remoto com
ferramenta e Guardar móvel externo; materiais e caderno ainda não. Os itens 2 a
4 abaixo foram implementados nessa candidata; o que falta verificar no jogo está
no marco.

O fluxo mutável existente é input semântico → intenção Native → admissão →
cliente de mundo → validação e transação canônicas → persistência e recibo →
replicação → aplicação validada no Native. Reutilizar o transporte, a
autoridade, o SQLite e o journal existentes. Não criar motor, banco, protocolo,
camada de compatibilidade ou segunda lógica de inventário por preferência.
O servidor permanece autoridade sobre saves e o jogo não continua offline.

Não montar uma nova build misturando pastas ou versões arbitrárias. Para C
alterado, produzir o Native e a ABI correspondentes; não reutilizar offsets
antigos sem medir o resultado. Uma alteração Web isolada só reaproveita o
Native anterior quando a identidade e o contrato forem comprovadamente
preservados. Não tratar compilação, fixture ou resumo de agente como prova do
fluxo do jogador.

## Primeiras entregas recomendadas

1. **Inventariar antes de operar.** Conferir branch/remoto, trabalho pendente,
   artefatos, serviços e operador de cada sessão. Preservar progresso útil e
   não dirigir a sessão de outra pessoa. Registros históricos não provam que
   um processo continua ativo. Testes devem ficar mudos; ampliar instâncias
   somente após avaliar a memória disponível.
2. **Fechar os reparos pequenos.** Estabilizar a reserva de HUD do editor de
   desenhos durante o traço, confirmar a ferramenta real quando a categoria
   é escolhida e restaurar o fundo do botão da roda. A precisão da grade não
   deve ser reescrita com base em hipóteses já refutadas pelo diagnóstico.
3. **Convergir apresentação multiplayer.** Revisar sombras de visitante e
   contato dos móveis. Investigar travadas/piscadas, ferramenta segurada e
   ações visíveis no outro cliente, coordenando as mesmas regiões da bridge.
   O contrato atual não representa a ferramenta segurada; isso é uma lacuna
   concreta, mas não uma explicação confirmada para todo defeito de animação.
4. **Conferir a recolha externa.** Exercitar a ação existente com proprietário,
   visitante, bolso cheio, distância e orientação. Distinguir móvel posicionado
   de item largado. Corrigir a descoberta e o acionamento touch sem permitir
   que o visitante remova mobiliário protegido.
5. **Integrar materiais de ponta a ponta.** Revisar coleta, consumo, pilhas,
   nomes/ícones, desenho por estação, drop/pickup e o último golpe da ferramenta.
   A proposta reserva a coleta antes do desgaste e aplica o desgaste original
   uma vez após a conclusão; ainda requer revisão e teste real. Não liberar
   emissão apenas porque o ícone e o nome já existem.
6. **Entregar o caderno em base própria.** Preservar contratos e providers
   técnicos do trabalho anterior, descartando o desenho rejeitado que copiava
   a roda. Gerar o novo alvo antes de redesenhar. O novo ImageGen ainda não
   foi executado.
7. **Fechar a release dos amigos.** Verificar somente caminhos alterados e
   dependências relevantes, preservar as provas válidas e executar um roteiro
   integrado curto para os sete aceites. Concluir pesca natural, disputa por
   recurso, recuperação e operação antes de declarar o lançamento pronto.

Materiais têm regra e autoridade próprias: o barril de referência usa cinco
madeiras e dois ferros. O protótipo de três maçãs ainda presente no candidato
é legado rejeitado, não alternativa de produção. Obter materiais novos deve
ser funcional; renomear um item antigo não resolve a dependência. Ações de
inventário, chão e crafting devem usar operações canônicas existentes, com
consumo atômico, capacidade validada e proteção contra duplicação.

## Processo visual obrigatório

Toda família de interface nova ou redesenhada segue: observar a UI nativa do
GameCube e a referência funcional de New Horizons → gerar propostas com
ImageGen → escolher o alvo → implementar → comparar com captura executável.
Aplicar também às telas do site e painéis já redesenhados. Cada família tem
composição própria; a roda aprovada não é o fundo universal de outros menus.

Preservar formas orgânicas e arredondadas, superfícies planas, tipografia,
cores e animações do jogo. Evitar cartões modernos com relevo ou excesso de
nitidez. Reutilizar fonte, ícones por ID, mão, raster e input existentes,
mantendo os recursos privados protegidos. O raster acompanha o fator aceito
1x/2x/3x do Native, sem DPR; legibilidade, alvos touch e nomes acessíveis
continuam adequados. Retrato vem primeiro, com paisagem e desktop conferidos.
Correções conservadoras de coordenadas, tamanho, ferramentas ou fundo perdido
podem avançar preservando o desenho aprovado.

## Escopo e critério de conclusão

O [plano de modernização](modernization/plan-v1.md) integra o escopo original.
Os marcos 0–6 permanecem ativos, com a primeira build para amigos como prioridade
de entrega e modernização em paralelo. Apenas WhatsApp fica para depois;
validação física em iPhone foi dispensada como requisito de conclusão.

Para cada incremento, registrar fonte e versão da referência, mudanças,
impacto em multiplayer/persistência, testes executados e limitações. Separar
**implementado**, **verificado**, **publicado**, **parcial** e **inconclusivo**.
Não ampliar automaticamente uma prova de visita para animações, pesca ou todas
as ações; não ampliar um restore íntegro para uma sessão de jogo restaurada.

Antes de nova publicação, revisar cada arquivo e sua origem, validar manifesto,
índice e árvore, manter recursos privados fora da exportação e conferir o SHA
remoto após o envio. Publicar fontes e relatórios é uma operação distinta de
implantar o jogo. Não anunciar um link de jogo ou prontidão de produção antes
de validar o serviço e obter a autorização correspondente.
