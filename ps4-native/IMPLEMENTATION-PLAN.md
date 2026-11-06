# HADES Store — plano de implementacao nativa PS4

Este diretorio contem o aplicativo nativo PS4. A loja web na raiz e um projeto separado.

## Estado do trabalho

- [x] Branch isolado `native/ps4-bootstrap`.
- [x] Diagnostico dos artefatos de teste e seus limites registrado.
- [x] Ponto de entrada minimo baseado no padrao libkernel do sample OpenOrbis.
- [x] Modelo de catalogo local com validacao de campos, URLs HTTPS, SHA-256 declarado, limite de tamanho e IDs unicos.
- [x] Camada de aplicacao com estados Inicio, Catalogo, Detalhes, Downloads e Configuracoes.
- [x] Contratos abstratos para entrada, renderizacao e cliente HTTPS.\n- [x] Gerenciador de downloads com fila unica, limite de tamanho, HTTPS e verificacao SHA-256 por adaptador.\n- [x] Estados logicos e atalhos de navegacao para Catalogo, Downloads e Configuracoes.
- [ ] Integrar os novos arquivos ao projeto de build Windows.
- [ ] Confirmar a linkagem do conjunto de arquivos C++ com a toolchain instalada.
- [ ] Implementar parser JSON com limites e validacao de esquema.
- [ ] Integrar renderizacao nativa com APIs OpenOrbis confirmadas.
- [ ] Mapear DualShock 4 para as acoes abstratas.
- [ ] Implementar cliente HTTPS e tratamento de falhas.
- [ ] Implementar adaptador de transporte HTTPS e verificacao SHA-256 real para o PS4.\n- [ ] Integrar gerenciador de downloads a interface e persistencia segura.
- [ ] Gerar metadados e PKG HADES.
- [ ] Testar instalacao, inicializacao e rede no PS4 alvo.

## Arquitetura

- `src/main.cpp`: entrada libkernel e ciclo principal.
- `src/HadesApp.h/.cpp`: fluxo e estado da aplicacao.
- `src/Catalog.h/.cpp`: modelo e validacao de catalogo.
- `src/Input.h`: acoes logicas independentes do controle fisico.
- `src/Platform.h`: interfaces para adaptadores especificos da plataforma.

## Decisoes tecnicas

- Nao reutilizar PKGs de teste como se fossem aplicativos prontos.
- Nao presumir APIs graficas, de controle ou HTTPS sem confirmar a release OpenOrbis instalada.
- Nao portar o exemplo Mandelbrot/Scene2D enquanto suas dependencias nao forem confirmadas.
- Nao incluir SDK proprietario, chaves privadas ou conteudo sem autorizacao.
- Nao declarar compatibilidade com firmware 13.52 sem teste real.
- Nao instalar automaticamente PKGs nem executar conteudo arbitrario.
- Manter o site GitHub Pages separado do binario nativo.

## Politica de testes desta fase

Durante a fase de implementacao, nao executar compilacao nem testes no computador do mantenedor. Quando a implementacao estiver mais completa, preparar um pacote unico de verificacao que confira arquivos, comandos, dependencias e erros de build, gerando relatorio antes de qualquer instalacao no console.
