# HADES Store — aplicativo nativo PS4

**Status deste checkout:** o código-fonte nativo continua no estágio de scaffold. O mantenedor relata que uma versão da loja foi instalada e executada em um PS4 e que os comandos do controle funcionaram; esse resultado não pode ser reproduzido a partir dos arquivos nativos presentes neste checkout.

## Alvo inicial

- Console de teste: PS4 com firmware 13.52 (informado pelo mantenedor)
- Ambiente: Windows
- Homebrew: GoldHEN
- SDK comunitário: OpenOrbis PS4 Toolchain

## Estrutura

- `src/main.cpp`: ponto de entrada inicial em C++ (placeholder, sem APIs gráficas ou de controle ainda).
- `README.md`: dependências, marcos e critérios de validação.

## Preparar o Windows

1. Instalar Visual Studio com o workload de desenvolvimento Desktop com C++.
2. Instalar a release oficial da OpenOrbis PS4 Toolchain: https://github.com/OpenOrbis/OpenOrbis-PS4-Toolchain
3. Seguir a documentação da mesma release para instalar as dependências e configurar `OO_PS4_TOOLCHAIN`.
4. Compilar primeiro o exemplo oficial `hello_world` sem alterações. Não usar binários de SDK proprietário ou arquivos de origem duvidosa.

## Marcos

- [ ] Instalar e validar a toolchain no Windows.
- [ ] Compilar o sample oficial hello_world.
- [x] Teste manual relatado pelo mantenedor: instalação e execução no PS4; comandos do controle funcionaram.
- [ ] Criar interface e navegação DualShock 4.
- [ ] Implementar catálogo HTTPS e downloads seguros.
- [ ] Gerar metadados e PKG.
- [ ] Testar instalação, inicialização e rede no firmware de teste.

## Limites

A versão web na raiz não pode ser simplesmente convertida ou renomeada para `.pkg`. Um pacote válido precisa conter um executável PS4 e metadados adequados. O EBOOT, o PKG e o código da versão relatada como testada não estão neste checkout. Compatibilidade com firmware 13.52 foi informada pelo mantenedor, mas não pode ser verificada pelos artefatos presentes aqui.

Distribua somente homebrews e arquivos que você tenha autorização para redistribuir. Não inclua SDK proprietário, chaves privadas ou conteúdo protegido.
