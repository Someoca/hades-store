# HADES Store

Loja web comunitária com catálogo JSON remoto, busca, filtros e navegação por teclado/controle. Esta versão é um site estático; não é um PKG nativo de PS4.

## Publicação automática
O workflow em `.github/workflows/pages.yml` publica o conteúdo da raiz no GitHub Pages a cada push na branch `main`.

## Catálogo
O catálogo inclui 50 recomendações de jogos PS4 com links de busca para a PlayStation Store brasileira. As cartas mostram capas estilizadas e discos ilustrados pela interface; não são imagens oficiais das capas nem representam arquivos incluídos. A preferência é por versões com português do Brasil, mas texto, áudio, disponibilidade e compatibilidade variam entre edições; confira a página oficial antes de adquirir.

Os links dos jogos abrem a PlayStation Store e não apontam para arquivos PKG. Use `downloadUrl` somente para páginas ou arquivos que você tem autorização para distribuir. A interface inclui a categoria Jogos PS4 e exibe informações de idioma e formato no detalhe.

Edite `catalog/catalog.json`. Cada item aceita `id`, `name`, `category` (Aplicativos, Homebrews, Emuladores ou Jogos), `version`, `icon`, `description`, `size`, `language`, `format` e `downloadUrl` HTTPS.

Use apenas pacotes que você tem autorização para distribuir. O botão abre o download; um site não instala PKG automaticamente no console.

## Aplicativo PS4 nativo
A geração do PKG é uma etapa separada: requer código nativo, toolchain PS4, eboot, metadados e testes no hardware/firmware alvo. Nenhum PKG é produzido por este repositório web.
