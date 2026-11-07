# HADES Store

Loja web comunitária com busca, filtros e navegação por teclado/controle. O site tem 200 jogos, 14 aplicativos e 2 emuladores. Todos os jogos e aplicativos têm imagens de capa; os itens novos usam arte HADES original e os 50 títulos iniciais apontam para imagens do CDN da PlayStation Store.

A página pública é publicada automaticamente pelo GitHub Actions. Os jogos levam à PlayStation Store brasileira. Aplicativos e emuladores apontam para releases oficiais quando disponíveis. O servidor local no Windows usa `start-local.ps1` e `stop-local.ps1`; ele expõe somente a interface, o catálogo e as capas na rede local.

Os instaladores do DolphinPS4 e do M33 ficam na pasta local `emuladores/` e são ignorados pelo Git por tamanho. Nenhum jogo, BIOS ou firmware acompanha esses downloads.

## Aplicativo nativo PS4

O código nativo SDL2 e o build automatizado estão em `ps4-native/`. Mudanças no código ou catálogo geram um artefato PKG pela workflow `Build HADES Store native PS4 PKG`. O pacote exige um PS4 preparado para executar homebrew. Ainda requer teste de instalação e execução no console-alvo antes de ser considerado validado.

