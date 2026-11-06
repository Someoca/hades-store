# HADES Store — aplicativo nativo PS4

**Status:** implementacao inicial da camada de aplicacao e do modelo de catalogo. Ainda nao e um PKG compilado nem validado no console.

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
- `src/Input.h`: acoes abstratas a mapear para o DualShock 4.
- `src/Platform.h`: contratos para entrada, renderizacao e HTTPS.

A camada de aplicacao ainda nao chama diretamente APIs graficas, de controle ou de rede. Isso evita acoplar o projeto a funcoes nao confirmadas na release OpenOrbis instalada.

## Fluxo previsto

Inicio → Catalogo → Detalhes, com areas futuras para Downloads e Configuracoes.

O catalogo atual contem entradas locais demonstrativas. Elas nao apontam para PKGs e nao permitem instalacao.

## Seguranca

- IDs e titulos possuem limites de tamanho.
- URLs de pacote devem usar HTTPS.
- Um item com URL precisa declarar SHA-256 de 64 caracteres.
- O tamanho declarado e limitado a 4 GiB.
- IDs duplicados sao rejeitados.
- Nenhum pacote e instalado ou executado automaticamente.
- A futura camada de rede devera validar JSON, tamanho recebido e hash real antes de disponibilizar arquivos.

## Etapas futuras

1. Integrar os modulos ao projeto de build Windows.
2. Confirmar a linkagem do conjunto C++ com a toolchain instalada.
3. Inspecionar ELF/OELF/SELF.
4. Integrar renderizacao nativa e entrada DualShock 4.
5. Implementar cliente HTTPS e parser JSON com limites.
6. Implementar downloads com verificacao SHA-256.
7. Gerar metadados e PKG HADES.
8. Testar instalacao, inicializacao e rede no PS4 alvo.

**Importante:** nenhuma compilacao ou teste de hardware foi executado nesta etapa. Compatibilidade com firmware 13.52 so podera ser afirmada apos validacao real.
