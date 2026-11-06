# HADES Store — aplicativo nativo PS4

**Status:** camada inicial de aplicacao, catalogo e gerenciador de downloads abstrato implementados no codigo-fonte. Ainda nao e um PKG compilado nem validado no console.

## Projeto e alvo

- Console-alvo informado: PS4 firmware 13.52 com GoldHEN.
- Ambiente: Windows 11 e OpenOrbis PS4 Toolchain.
- Repositorio: https://github.com/Someoca/hades-store
- Branch: `native/ps4-bootstrap`.
- O site GitHub Pages permanece separado do aplicativo nativo.

## Arquitetura atual

- `src/main.cpp`: ponto de entrada libkernel e ciclo principal.
- `src/HadesApp.h/.cpp`: estado da aplicacao, telas e navegacao logica.
- `src/Catalog.h/.cpp`: modelo de itens, selecao e validacao de metadados.
- `src/DownloadManager.h/.cpp`: fila unica, estados de download, limites, HTTPS e verificacao SHA-256 delegada a adaptadores.
- `src/Input.h`: acoes abstratas a mapear para o DualShock 4.
- `src/Platform.h`: contratos para entrada, renderizacao e HTTPS.

## Fluxo de telas

- Inicio
- Catalogo
- Detalhes
- Downloads
- Configuracoes

A camada de aplicacao aceita acoes logicas para abrir as areas. O mapeamento fisico do DualShock 4 e a renderizacao ainda precisam de adaptadores especificos OpenOrbis.

## Catalogo e seguranca de downloads

- IDs e titulos possuem limites de tamanho e IDs duplicados sao rejeitados.
- URLs de pacote devem usar HTTPS.
- Um item com URL precisa declarar SHA-256 de 64 caracteres.
- O tamanho declarado e limitado a 4 GiB.
- O gerenciador impede duas tarefas simultaneas nesta primeira versao.
- O transporte devera gravar em arquivo temporario e impor limite de bytes.
- O verificador devera calcular SHA-256 a partir dos bytes efetivamente recebidos.
- Somente arquivos verificados sao expostos como prontos.
- Nenhum pacote e instalado ou executado automaticamente.

O transporte HTTPS, a verificacao criptografica concreta e a instalacao ainda nao estao ligados a APIs de plataforma.

## Fontes esperadas no build nativo

- `src/main.cpp`
- `src/HadesApp.cpp`
- `src/Catalog.cpp`
- `src/DownloadManager.cpp`

Os arquivos `.h` sao incluidos pelos fontes. O build Windows ainda precisa ser atualizado para compilar e linkar todos os quatro arquivos C++.

## Etapas futuras

1. Atualizar o build Windows para compilar todos os fontes.
2. Confirmar linkagem com a toolchain OpenOrbis instalada.
3. Integrar renderizacao nativa e entrada DualShock 4.
4. Implementar parser JSON com limites e validacao de esquema.
5. Implementar adaptador HTTPS e SHA-256 real.
6. Ligar a interface ao gerenciador de downloads.
7. Gerar metadados e PKG HADES.
8. Preparar pacote unico de verificacao de comandos e erros.
9. Testar instalacao, inicializacao e rede no PS4 alvo.

**Importante:** nenhuma compilacao ou teste de hardware foi executado nesta etapa. Compatibilidade com firmware 13.52 so podera ser afirmada apos validacao real.
