# HADES Store — catálogo online

A versão web está publicada no GitHub Pages e compartilha o catálogo, os filtros e as imagens de capa com o pacote nativo. O catálogo tem 200 jogos, 14 aplicativos e 2 emuladores. As capas dos 150 jogos e dos aplicativos novos são arte HADES original; os 50 primeiros jogos usam imagens do CDN da PlayStation Store.

Os jogos abrem páginas da PlayStation Store brasileira. O catálogo não fornece arquivos de jogos comerciais. Consulte a loja oficial para confirmar edição, idioma, disponibilidade e DLC.

## Servidor local

Na raiz do repositório, use `start-local.ps1` com PC e PS4 na mesma rede para servir o site, o catálogo e as capas. Execute `stop-local.ps1` para encerrar.

## Emuladores

DolphinPS4 e M33 aparecem na categoria Emuladores com links para releases oficiais. As cópias `.pkg` baixadas neste PC estão em `emuladores/` e são ignoradas pelo Git. Não incluem jogos, BIOS, chaves ou firmware.

## Pacote nativo

O workflow `.github/workflows/build-ps4-native.yml` cria um PKG de teste com OpenOrbis. O artefato fica na página Actions após o build. Instalação e navegação precisam ser verificadas no hardware antes de marcar o app como concluído.

