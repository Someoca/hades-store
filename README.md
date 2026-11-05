# HADES Store

Loja web comunitária com catálogo JSON remoto, busca, filtros e navegação por teclado/controle. Esta versão é um site estático; não é um PKG nativo de PS4.

## Publicação automática
O workflow em `.github/workflows/pages.yml` publica o conteúdo da raiz no GitHub Pages a cada push na branch `main`.

## Catálogo
Edite `catalog/catalog.json`. Cada item aceita `id`, `name`, `category` (Aplicativos, Homebrews ou Emuladores), `version`, `icon`, `description`, `size` e `downloadUrl` HTTPS.

Use apenas pacotes que você tem autorização para distribuir. O botão abre o download; um site não instala PKG automaticamente no console.

## Aplicativo PS4 nativo
A geração do PKG é uma etapa separada: requer código nativo, toolchain PS4, eboot, metadados e testes no hardware/firmware alvo. Nenhum PKG é produzido por este repositório web.