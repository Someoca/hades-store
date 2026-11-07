# HADES Store

Loja web comunitária com catálogo JSON remoto, busca, filtros e navegação por teclado/controle. Esta versão é um site estático; não é um PKG nativo de PS4.

## Publicação automática
O workflow em `.github/workflows/pages.yml` publica o conteúdo da raiz no GitHub Pages a cada push na branch `main`.

## Catálogo
O catálogo contém 200 jogos PS4 e 14 aplicativos. Os 50 primeiros jogos usam artes oficiais carregadas do CDN da PlayStation Store; os 150 adicionados usam capas gráficas originais HADES com o título do jogo. As páginas de cada jogo apontam para a PlayStation Store brasileira. Os detalhes oferecem busca oficial por DLC e instruções de atualização no console. Idioma, disponibilidade e compatibilidade variam por edição; confirme na página da Store.

Os links dos jogos abrem a PlayStation Store e não apontam para arquivos PKG. Use `downloadUrl` somente para páginas ou arquivos que você tem autorização para distribuir. A interface inclui a categoria Jogos PS4 e exibe informações de idioma e formato no detalhe.

Edite `catalog/catalog.json`. Cada item aceita `id`, `name`, `category` (Aplicativos, Homebrews, Emuladores ou Jogos), `version`, `icon`, `description`, `size`, `language`, `format` e `downloadUrl` HTTPS.

Use apenas pacotes que você tem autorização para distribuir. O botão abre o download; um site não instala PKG automaticamente no console.

## Aplicativo PS4 nativo
A geração do PKG é uma etapa separada: requer código nativo, toolchain PS4, eboot, metadados e testes no hardware/firmware alvo. Nenhum PKG é produzido por este repositório web.

## Servidor local no Windows
1. Conecte o PC e o PS4 à mesma rede local.
2. Execute `start-local.ps1` no PowerShell. O servidor usa Node.js, escuta na interface IPv4 local do PC na porta `8000` e serve apenas a interface, o catálogo e as capas do site.
3. Abra no navegador do PS4 o endereço mostrado pelo script, no formato `http://IP-LOCAL-DO-PC:8000/`.
4. Execute `stop-local.ps1` para encerrar o servidor.

O servidor local publica a versão web e o JSON do catálogo. O scaffold em `ps4-native/` ainda não tem cliente de rede compilável e, portanto, não se conecta a esse servidor como aplicativo nativo. Os links de jogos continuam indo à PlayStation Store; o servidor não hospeda arquivos de jogos, DLCs ou atualizações.


