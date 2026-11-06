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
- `src/HadesApp.h/.cpp`: estado da aplicacao, telas e navegacao logica.
- `src/Catalog.h/.cpp`: modelo de itens, selecao, validacao e leitura do catalogo JSON.
- `src/Json.h/.cpp`: parser JSON com limites de entrada, profundidade e quantidade de nos.
- `src/DownloadManager.h/.cpp`: fila unica, estados, limite de tamanho, HTTPS e verificacao SHA-256 delegada a adaptadores.
- `src/Input.h`: acoes abstratas a mapear para o DualShock 4.
- `src/Platform.h`: contratos para entrada, renderizacao e HTTPS.
- `catalog/SCHEMA.md`: contrato do catalogo v1.
- `catalog/catalog-v1.example.json`: exemplo de dados locais.

## Fluxo de telas

Inicio, Catalogo, Detalhes, Downloads e Configuracoes. A camada aceita acoes logicas para abrir as areas. O mapeamento fisico do DualShock 4 e a renderizacao ainda precisam de adaptadores especificos OpenOrbis.

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

Os headers sao incluidos pelos fontes. O processo Windows ainda precisa compilar e linkar todos esses arquivos.

## Etapas futuras

1. Atualizar o build Windows para todos os fontes.
2. Integrar renderizacao nativa e entrada DualShock 4.
3. Implementar adaptador HTTPS e SHA-256 real.
4. Ligar catalogo remoto e downloads a interface.
5. Gerar metadados e PKG HADES.
6. Preparar pacote unico de verificacao de comandos e erros.
7. Testar instalacao, inicializacao e rede no PS4 alvo.

**Importante:** nenhuma compilacao ou teste de hardware foi executado nesta etapa. Compatibilidade com firmware 13.52 so podera ser afirmada apos validacao real.
