# HADES Store — aplicativo nativo para PS4

O aplicativo nativo usa SDL2 e a toolchain comunitária OpenOrbis. A tela inicial da versão 1.4 usa um visual carvão e cobre, atalhos interativos para Todos, Jogos, Aplicativos, Emuladores e Favoritos, além de uma breve animação de abertura que pode ser pulada pelo controle. A biblioteca usa a mesma fonte de dados `catalog/catalog.json` da loja web. A pesquisa localiza termos no nome e na descrição dos itens e inclui teclado virtual navegável pelo DualShock 4; também aceita teclado físico conectado. As capas são empacotadas localmente para navegação offline; os detalhes dos emuladores também mostram a seleção de jogos recomendados cadastrada no catálogo.

## Controles

| Ação | DualShock 4 |
| --- | --- |
| Navegar | Direcional |
| Mudar categoria | L1 / R1 (Todos, Jogos, Aplicativos, Emuladores, Favoritos) |
| Abrir detalhes | Cross (X) |
| Abrir o link do item no navegador | Square |
| Marcar/desmarcar favorito (gravação local em /data) | L3 (pressionar analógico esquerdo) |
| Iniciar pesquisa no catálogo | Share (ou `/` em teclado conectado) |
| Digitar na pesquisa | Teclado virtual: direcional/analógico para navegar, Cross para inserir, Circle ou L1 para apagar e R1 para espaço; teclado físico também funciona |
| Fechar pesquisa | Triângulo ou Esc; Backspace apaga caractere no teclado físico |
| Mostrar/ocultar apenas favoritos | R3 (pressionar analógico direito) |
| Voltar / fechar detalhes | Circle |
| Encerrar aplicativo | Options |

Na tela inicial, Cross abre a categoria selecionada. Circle encerra o aplicativo, e qualquer botão pula a introdução animada. Os favoritos são carregados e gravados em `/data/hades-store-favorites.dat`. A interface indica quando a gravação foi confirmada; se o caminho não for gravável no firmware/ambiente, o app mantém a sessão sem afirmar que salvou. A persistência precisa ser confirmada em teste físico no console.

## Gerar o PKG

O build usa o contêiner OpenOrbis `v0.5.1` e roda automaticamente em alterações no código nativo, nas artes do avatar, banner, símbolo e mascote, nas capas ou no catálogo, tanto em commits para `main` quanto em pull requests destinados a `main`. Também pode ser iniciado manualmente em **Actions → Build HADES Store native PS4 PKG → Run workflow**.

O artefato `HADES-Store-PS4-v1.4.pkg` e o arquivo `SHA256SUMS.txt` ficam disponíveis no workflow por 30 dias. Para compilar em Linux com OpenOrbis v0.5.1 instalado e `OO_PS4_TOOLCHAIN` configurado:

```sh
bash ps4-native/build.sh
```

O pacote será gravado em `ps4-native/dist/` e requer um PS4 configurado para executar homebrew, como GoldHEN.

## Componentes

- `src/main.cpp`: interface SDL2, navegação pelo controle, detalhes dos itens e abertura dos links externos.
- `generate_catalog.py`: gera o catálogo nativo a partir de `catalog/catalog.json`.
- `prepare_icon.py`: cria o ícone do PKG e a arte do mascote.
- `prepare_covers.py`: prepara as capas BMP a partir das imagens cadastradas ou da arte SVG local.
- `prepare_font.py`: cria a atlas BMP da fonte usada na interface.
- `tools/generate-app-covers.mjs`: gera capas vetoriais para aplicativos e emuladores.

O app não contém jogos comerciais, BIOS, chaves ou firmware. No PKG nativo, os botões de abrir item usam somente `downloadUrl` HTTPS de terceiros; URLs oficiais Sony/PlayStation não são incluídas como destino de abertura. Itens sem destino externo válido continuam visíveis no catálogo, mas não abrem um link.

## Validação no console

O pipeline confirma que o pacote foi compilado e gera sua soma SHA-256. A instalação, inicialização, vídeo, leitura de botões e abertura de links ainda precisam ser testadas no PS4 de destino. Portanto, um build aprovado no GitHub não deve ser interpretado como certificação de funcionamento em hardware.
