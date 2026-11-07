# HADES Store — aplicativo nativo para PS4

Este projeto compila uma interface nativa usando SDL2 e a toolchain comunitária OpenOrbis. O catálogo de 200 jogos, 14 aplicativos e 2 emuladores é incorporado ao pacote durante o build. O DualShock 4 navega entre categorias e itens; X abre os detalhes e, em seguida, o link oficial no navegador do PS4. O círculo volta e Options encerra o aplicativo.

## Gerar o PKG

O build roda no workflow `.github/workflows/build-ps4-native.yml`, usando o contêiner OpenOrbis `v0.5.1`. Ele é acionado ao enviar mudanças no código nativo ou no catálogo para `main`, ou pelo botão **Run workflow** na página Actions do GitHub. O arquivo `HADES-Store-PS4-v1.0.pkg` fica disponível como artefato do workflow por 30 dias, acompanhado do SHA-256.

Também é possível compilar em um ambiente Linux com OpenOrbis v0.5.1 instalado e `OO_PS4_TOOLCHAIN` configurado:

```sh
bash ps4-native/build.sh
```

O pacote será gravado em `ps4-native/dist/`. Ele é um pacote homebrew de teste e requer console configurado para executar homebrew, como GoldHEN.

## Componentes e procedência

- `src/main.cpp`: interface SDL2, navegação pelo controle, detalhes dos itens e abertura dos links externos.
- `generate_catalog.py`: gera o catálogo nativo a partir de `catalog/catalog.json`.
- `generate_icon.py`: cria o ícone PNG do PKG usando apenas a biblioteca padrão de Python.
- O build baixa a release oficial OpenOrbis v0.5.1 e reutiliza o Makefile, GP4 e módulos de suporte do sample SDL2; o catálogo e o ícone HADES são gerados para o pacote.

O app não contém jogos, BIOS, chaves nem firmware. Os jogos apontam para a PlayStation Store; aplicativos e emuladores usam os destinos cadastrados. Confirme procedência e compatibilidade antes de instalar arquivos externos.

## Validação

O pipeline gera o pacote e a soma SHA-256. A instalação, inicialização, vídeo, leitura de botões e abertura de links precisam ser validadas no PS4 de destino antes de chamar este build de final. O firmware 13.52 foi mencionado anteriormente como console de teste, mas este ambiente não controla o console conectado.

