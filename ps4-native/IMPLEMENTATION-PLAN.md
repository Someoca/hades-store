# HADES Store — plano de implementacao nativa PS4

Este diretorio contem o aplicativo nativo PS4. A loja web na raiz e um projeto separado.

## Estado do trabalho

- [x] Branch isolado `native/ps4-bootstrap`.
- [x] Ponto de entrada minimo baseado no padrao libkernel do sample OpenOrbis.
- [x] Modelo de catalogo local com validacao de campos, HTTPS, SHA-256 declarado, limite de tamanho e IDs unicos.
- [x] Camada de aplicacao com estados Inicio, Catalogo, Detalhes, Downloads e Configuracoes.
- [x] Contratos abstratos para entrada, renderizacao e cliente HTTPS.
- [x] Gerenciador de downloads com fila unica, limite de tamanho e verificacao SHA-256 delegada.
- [x] Parser JSON com limites de bytes, profundidade, nos e rejeicao de chaves duplicadas.
- [x] Adaptador de documento JSON para o modelo do catalogo, com substituicao atomica apos validacao.
- [x] Esquema v1 e documento de exemplo do catalogo.\n- [x] Servico de catalogo com validacao HTTPS e substituicao somente apos resposta valida.\n- [x] Modelo de configuracoes com limites e interface abstrata de persistencia.\n- [x] Navegacao logica das preferencias por acoes esquerda/direita.\n- [x] Modelo de apresentacao AppView para inicio, catalogo, detalhes, downloads e configuracoes.\n- [x] Contrato ViewRenderer desacoplado das APIs graficas do console.
- [ ] Integrar os novos arquivos ao projeto de build Windows (incluindo CatalogService.cpp e Settings.cpp).
- [ ] Confirmar a linkagem do conjunto C++ com a toolchain instalada.
- [ ] Implementar renderizador grafico concreto com APIs OpenOrbis confirmadas.
- [x] Definir mapeamento logico dos botoes do controle para acoes abstratas.\n- [ ] Implementar leitura fisica do DualShock 4 com APIs OpenOrbis confirmadas.
- [ ] Implementar cliente HTTPS e tratamento de falhas.
- [ ] Implementar adaptador real de transporte e hash SHA-256 no PS4.
- [ ] Ligar catalogo remoto e gerenciador de downloads a interface e persistir configuracoes.
- [ ] Gerar metadados e PKG HADES.
- [ ] Testar instalacao, inicializacao e rede no PS4 alvo.

## Arquitetura

- `src/main.cpp`: entrada libkernel e ciclo principal.
- `src/HadesApp.h/.cpp`: fluxo e estado da aplicacao.
- `src/Catalog.h/.cpp`: modelo, validacao e carregamento JSON.
- `src/Json.h/.cpp`: parser JSON limitado.
- `src/DownloadManager.h/.cpp`: fila e verificacao delegada de downloads.
- `src/Input.h`: acoes logicas independentes do controle fisico.
- `src/Platform.h`: interfaces para adaptadores especificos da plataforma.
- `catalog/SCHEMA.md`: contrato do catalogo v1.
- `catalog/catalog-v1.example.json`: exemplo local sem URLs de pacotes.

## Decisoes tecnicas

- Nao reutilizar PKGs de teste como se fossem aplicativos prontos.
- Nao presumir APIs graficas, de controle ou HTTPS sem confirmar a release OpenOrbis instalada.
- Nao incluir SDK proprietario, chaves privadas ou conteudo sem autorizacao.
- Nao declarar compatibilidade com firmware 13.52 sem teste real.
- Nao instalar automaticamente PKGs nem executar conteudo arbitrario.
- Manter o site GitHub Pages separado do binario nativo.

## Politica de testes desta fase

Durante a implementacao, nao executar compilacao nem testes no computador do mantenedor. Quando a implementacao estiver mais completa, preparar um pacote unico de verificacao que confira fontes, comandos, dependencias e erros de build, gerando relatorio antes de qualquer instalacao no console.
