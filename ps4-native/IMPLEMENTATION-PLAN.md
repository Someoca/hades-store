# HADES Store — plano de implementação nativa PS4

Este diretório é o aplicativo nativo PS4. A loja web na raiz é um projeto separado.

## Estado confirmado

- O repositório ainda contém apenas um ponto de entrada C++ placeholder.
- O pacote de teste local passou pela validação estrutural do PKG e pela verificação de hashes executada por `pkg_validate`.
- O `eboot.bin` extraído começa com os bytes `4F 15 3D 1D`, compatíveis com o magic SELF em little-endian.
- O `graphics.elf` analisado é ELF64 x86-64, tipo `ET_DYN`, ABI SystemV e entry `0x20`. Isso, sozinho, não demonstra que ele foi linkado para o ambiente PS4.
- O `graphics.oelf` existe, mas ainda não foi inspecionado por uma ferramenta que valide seu conteúdo.
- Nenhum teste de execução no PS4 foi confirmado.

## Decisão técnica

Não reutilizar nem instalar o PKG de teste como se fosse um aplicativo pronto. Primeiro estabelecer uma compilação mínima reproduzível a partir de um exemplo oficial OpenOrbis, com toolchain e flags documentadas. Só depois evoluir para interface, controle DualShock 4, catálogo HTTPS e downloads.

## Marcos e critérios de aceite

1. **Ambiente** — detectar a toolchain OpenOrbis e registrar versões/caminhos dos utilitários.
2. **Hello World oficial** — compilar sem alterações um exemplo oficial e preservar o log completo.
3. **Bootstrap HADES** — portar o ponto de entrada mínimo para o projeto, sem APIs gráficas presumidas.
4. **Interface** — renderização nativa e navegação por controle, testadas no hardware.
5. **Catálogo** — consumir JSON HTTPS com validação de esquema, limites e tratamento de falhas.
6. **Downloads** — validar HTTPS, tamanho e integridade; não executar nem instalar conteúdo automaticamente.
7. **PKG** — gerar metadados e pacote reproduzíveis; validar estrutura, hashes e assinatura conforme ferramentas disponíveis.
8. **Teste real** — instalação e inicialização no PS4 alvo; registrar firmware, GoldHEN, logs e resultado.

## Regras de segurança e qualidade

- Não incluir SDK proprietário, chaves privadas ou conteúdo sem autorização de redistribuição.
- Não declarar compatibilidade com firmware 13.52 sem teste real nesse firmware.
- Não instalar automaticamente PKGs nem baixar/executar binários arbitrários.
- Manter o site GitHub Pages separado do binário nativo.
- Toda etapa de build deve gerar log e falhar claramente quando uma dependência estiver ausente.
