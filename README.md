# HADES Store

Loja comunitária para PS4 com catálogo web e aplicativo nativo. A versão web oferece busca por texto, filtros por categoria, ordenação e favoritos locais. O catálogo atual contém jogos, aplicativos e emuladores; os links devem apontar para páginas oficiais ou fontes autorizadas.

## Recursos

- Catálogo central em `catalog/catalog.json`, compartilhado com o gerador do aplicativo nativo.
- Busca sem distinção de acentos, filtros por categoria e ordenação alfabética.
- Favoritos salvos no navegador do usuário (localStorage); não são enviados a um servidor.
- Interface responsiva para desktop, tablet e celular, com suporte a teclado e navegação por controle.
- Efeitos sonoros sintetizados para a navegação, ativados manualmente e com preferência salva no navegador.
- Validação automática de campos, IDs únicos, categorias e URLs HTTPS.
- Deploy do site pelo GitHub Actions após validação.
- Build do aplicativo nativo PS4 com OpenOrbis e SDL2.

## Executar localmente

No Windows, use `start-local.ps1` para iniciar o servidor local e `stop-local.ps1` para encerrá-lo. O site é estático: não exige banco de dados nem envia favoritos para a rede.

Para validar o catálogo e a sintaxe JavaScript com Node.js 20 ou superior:

```sh
node tools/validate-catalog.mjs
node --check app.js
```

## Baixar as capas para a Área de Trabalho

Com Node.js 20 ou superior, execute na pasta do projeto:

```sh
node tools/download-covers-to-desktop.mjs
```

O script copia as capas locais do catálogo e baixa as capas HTTPS para `HADES Store Capinhas` na Área de Trabalho. Para escolher outra pasta, use `node tools/download-covers-to-desktop.mjs --output "C:\Capinhas"`.

## Aplicativo nativo PS4

O código SDL2 e o processo de build estão em `ps4-native/`. Consulte [ps4-native/README.md](ps4-native/README.md) para gerar o PKG. O pacote é homebrew de teste e exige um console preparado para executar homebrew. A aprovação do build automatizado não substitui testes de instalação, inicialização, controles e abertura de links no console-alvo.

## Segurança e procedência

A HADES Store é um catálogo/launcher comunitário. Não distribui jogos comerciais, BIOS, chaves ou firmware. Verifique sempre a procedência e a licença dos arquivos externos antes de baixar ou instalar.
