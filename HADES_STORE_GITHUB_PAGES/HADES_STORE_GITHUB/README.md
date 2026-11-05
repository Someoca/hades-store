# HADES Store — catálogo online (base para GitHub Pages)

Esta entrega é a **versão web do catálogo** preparada para hospedagem estática no GitHub Pages. Ela NÃO é um aplicativo PS4 nativo e NÃO contém um `.pkg` instalável.

## Publicar no GitHub Pages
1. Crie um repositório público no GitHub chamado `hades-store`.
2. Envie todos os arquivos desta pasta para a raiz do repositório (incluindo `.github/workflows`).
3. Abra **Settings → Pages** e selecione **GitHub Actions** como fonte de publicação.
4. Aguarde o workflow `Deploy HADES Store to GitHub Pages` terminar. A URL ficará no formato `https://SEU-USUARIO.github.io/hades-store/`.
5. Abra a URL no navegador e teste busca, filtros e navegação por teclado.

## Adicionar um pacote legítimo ao catálogo
- Publique o `.pkg` que você tem direito de distribuir em uma GitHub Release ou em um host HTTPS confiável.
- Edite `catalog/catalog.json` e preencha `downloadUrl` com a URL HTTPS direta do arquivo, `version`, `size` e descrição.
- Não use links de conteúdo pirateado, pacotes adulterados ou arquivos sem autorização de distribuição.
- O botão de download apenas baixa/abre o arquivo. **Uma página web não consegue instalar um PKG automaticamente no PS4.** A instalação continua sendo feita pelo fluxo suportado pelo console/homebrew.

Exemplo de item:
```json
{
  "id": "meu-app-01",
  "name": "Meu Homebrew",
  "category": "Homebrews",
  "version": "1.0.0",
  "icon": "H",
  "description": "Descrição do projeto e requisitos.",
  "size": "25 MB",
  "downloadUrl": "https://github.com/SEU-USUARIO/SEU-REPO/releases/download/v1.0/app.pkg"
}
```

## Sobre o PKG nativo
Para gerar o aplicativo instalável é necessário um segundo projeto nativo (por exemplo, C/C++ com OpenOrbis), produzir `eboot.bin`, metadados e pacote com a toolchain, e testar no hardware/firmware de destino. Este repositório não afirma que isso já foi feito. Consulte: https://github.com/OpenOrbis/OpenOrbis-PS4-Toolchain
