# HADES Store — aplicativo nativo PS4

**Status:** camada de aplicacao, modelo de catalogo, parser JSON e gerenciador de downloads abstrato implementados no codigo-fonte. Ainda nao e um PKG compilado nem validado no console.

## Projeto e alvo

- Console-alvo informado: PS4 firmware 13.52 com GoldHEN.
- Ambiente: Windows 11 e OpenOrbis PS4 Toolchain.
- Repositorio: https://github.com/Someoca/hades-store
- Branch: `native/ps4-bootstrap`.
- O site GitHub Pages permanece separado do aplicativo nativo.

## Arquitetura atual

- `src/main.cpp`: ponto de entrada libkernel e ciclo principal.
- `sources.cmake`: manifesto central de arquivos C++ e headers para manter o build sincronizado.
- `src/HadesApp.h/.cpp`: estado da aplicacao, telas, navegacao e montagem do modelo visual.
- `src/AppLoop.h`: orquestrador de frame que conecta entrada, estado e renderizador.
- `src/Catalog.h/.cpp`: modelo de itens, selecao, validacao e leitura do catalogo JSON.
- `src/Json.h/.cpp`: parser JSON com limites de entrada, profundidade e quantidade de nos.
- `src/DownloadManager.h/.cpp`: fila unica, estados, limite de tamanho, HTTPS e verificacao SHA-256 delegada a adaptadores.
- `src/Input.h`: acoes abstratas da aplicacao.
- `src/ControllerMapping.h`: mapeamento logico dos botoes para acoes, aguardando o adaptador OpenOrbis.
- `src/Platform.h`: contratos para entrada e HTTPS.
- `src/AppView.h`: modelo independente de tela, linhas e selecao.
- `src/ViewRenderer.h`: contrato para renderizadores concretos.
- `src/CatalogService.h/.cpp`: atualizacao do catalogo via cliente HTTPS injetado.
- `src/Settings.h/.cpp`: preferencias e contrato abstrato de persistencia.
- `catalog/SCHEMA.md`: contrato do catalogo v1.
- `catalog/catalog-v1.example.json`: exemplo de dados locais.

## Fluxo de telas

Inicio, Catalogo, Detalhes, Downloads e Configuracoes. A camada aceita acoes logicas para abrir as areas e agora monta um modelo visual (`AppView`) com linhas, selecao, detalhes e preferencias. O renderizador grafico concreto ainda nao foi implementado. O mapeamento logico dos botoes esta definido em `ControllerMapping.h`; a leitura fisica do controle ainda precisa de um adaptador OpenOrbis confirmado. A renderizacao grafica concreta tambem permanece pendente.

## Catalogo e seguranca

- O documento JSON e limitado a 1 MiB, 24 niveis e 20.000 nos.
- O catalogo aceita no maximo 500 itens.
- Chaves duplicadas e IDs duplicados sao rejeitados.
- O documento so substitui o catalogo atual depois de validacao completa.
- URLs de pacote devem usar HTTPS e declarar SHA-256 de 64 caracteres.
- O tamanho declarado e limitado a 4 GiB.
- O transporte futuro devera gravar em arquivo temporario e impor limite real de bytes.
- O verificador futuro devera calcular SHA-256 a partir dos bytes efetivamente recebidos.
- Nenhum pacote e instalado ou executado automaticamente.

O parser e o modelo estao implementados, mas conexao HTTPS, autenticacao da origem e hash criptografico concreto ainda nao estao ligados a APIs da plataforma.

## Fontes C++ para o futuro build

- `src/main.cpp`
- `src/HadesApp.cpp`
- `src/Catalog.cpp`
- `src/Json.cpp`
- `src/DownloadManager.cpp`
- `src/CatalogService.cpp`
- `src/Settings.cpp`

Os headers sao incluidos pelos fontes. O processo Windows ainda precisa compilar e linkar todos esses arquivos. `AppLoop.h` e os demais headers sao incluidos pelos fontes.

## Etapas futuras

1. Usar `sources.cmake` como manifesto e atualizar o build Windows para todos os fontes.
2. Integrar renderizacao nativa e entrada DualShock 4.
3. Implementar adaptador HTTPS e SHA-256 real.
4. Ligar catalogo remoto e downloads a interface.
5. Gerar metadados e PKG HADES.
6. Preparar pacote unico de verificacao de comandos e erros.
7. Testar instalacao, inicializacao e rede no PS4 alvo.

**Importante:** nenhuma compilacao ou teste de hardware foi executado nesta etapa. Compatibilidade com firmware 13.52 so podera ser afirmada apos validacao real.


## Build Windows/OpenOrbis (estrutura inicial)

- `tools/build-hades.ps1`: compila os arquivos C++ do manifesto e executa a etapa de linkagem.
- `tools/build-config.example.psd1`: modelo para informar os caminhos do clang++/ld.lld e os argumentos exatos da toolchain instalada.
- Copie o modelo para um arquivo local de configuracao e preencha os argumentos conforme a release OpenOrbis instalada. O script nao presume target, bibliotecas, linker script ou flags.
- O driver gera somente o ELF. FSELF, GP4, PKG e instalacao continuam em etapas separadas.

Exemplo de chamada depois de configurar os argumentos:

```powershell
.\tools\build-hades.ps1 -ConfigFile .\tools\build-config.local.psd1
```

A estrutura do driver foi adicionada, mas nao foi executada nem validada por compilacao nesta etapa.


## Metadados do pacote PS4

- `package/package-metadata.example.json`: modelo declarativo para nome, Title ID, Content ID, versao, versao minima de sistema e recursos.
- `tools/validate-package-metadata.ps1`: valida os campos obrigatorios e rejeita identificadores ainda marcados como CHANGE_ME.
- Defina identificadores oficiais/reservados antes de qualquer empacotamento. Nao reutilize Title ID de outro aplicativo.
- Esta validacao nao gera `param.sfo`, GP4, FSELF ou PKG; esses formatos serao produzidos somente quando os parametros e ferramentas da release OpenOrbis estiverem confirmados.


## Estrutura e validacao dos recursos do pacote

- `package/README.md`: documenta a estrutura esperada e a origem de cada recurso.
- `package/resources-manifest.example.json`: lista o executavel FSELF e o icone esperados.
- `tools/validate-package-resources.ps1`: verifica caminhos relativos, duplicidades, existencia dos recursos obrigatorios e correspondencia com os metadados.
- O pre-check Windows agora inclui esses arquivos de preparacao.

O manifesto ainda aponta para arquivos que serao produzidos posteriormente. O validador deve sinalizar esses itens como pendentes enquanto nao existirem. Ele nao verifica a integridade interna do FSELF ou as dimensoes/formato do PNG, e nao gera GP4, param.sfo ou PKG.


## Base visual independente da plataforma

- `src/UiTheme.h`: tokens semanticos de cor e medidas de layout para o futuro renderizador.
- A paleta define fundo, superficies, selecao, destaque, texto e aviso; as medidas padronizam margens, cabecalho, rodape e linhas.
- Os valores sao RGBA logicos e nao presumem formato de framebuffer, API grafica ou resolucao do console.
- O manifesto `sources.cmake` e o pre-check incluem o novo header.
