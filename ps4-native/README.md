# HADES Store — aplicativo nativo PS4

**Status:** scaffold inicial; ainda não é um PKG compilado nem testado no console.

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
- [ ] Executar o primeiro EBOOT no PS4.
- [ ] Criar interface e navegação DualShock 4.
- [ ] Implementar catálogo HTTPS e downloads seguros.
- [ ] Gerar metadados e PKG.
- [ ] Testar instalação, inicialização e rede no firmware de teste.

## Limites

A versão web na raiz não pode ser simplesmente convertida ou renomeada para `.pkg`. Um pacote válido precisa conter um executável PS4 e metadados adequados. Ainda não existe EBOOT nem PKG neste repositório. Compatibilidade com firmware 13.52 só poderá ser afirmada após testes reais.

Distribua somente homebrews e arquivos que você tenha autorização para redistribuir. Não inclua SDK proprietário, chaves privadas ou conteúdo protegido.
