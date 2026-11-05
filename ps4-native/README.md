# HADES Store — aplicativo nativo para PS4

> Estado: planejamento técnico. Este diretório ainda não contém um EBOOT nem um PKG instalável.

## Alvo inicial

- Console: PS4
- Firmware de teste informado: 13.52
- Ambiente: Windows para desenvolvimento
- Homebrew environment: GoldHEN
- Toolchain a avaliar: OpenOrbis PS4 Toolchain

## Por que o site não é um PKG

O conteúdo da raiz deste repositório é uma aplicação web estática. Para gerar um pacote PS4 real é necessário compilar um executável nativo para a plataforma, preparar os metadados do aplicativo e empacotar os arquivos no formato esperado pelo console. Renomear um ZIP ou copiar o site para um arquivo .pkg não produz um aplicativo válido.

## Etapas de implementação

1. Instalar e validar a OpenOrbis PS4 Toolchain no Windows.
2. Criar um projeto C/C++ nativo e confirmar a compilação de um EBOOT mínimo.
3. Implementar a interface HADES Store e navegação com DualShock 4.
4. Implementar catálogo HTTPS e download de arquivos com validação de URL, tamanho e integridade.
5. Preparar param.sfo, ícone, assets e estrutura de pacote.
6. Gerar o PKG com as ferramentas apropriadas da toolchain.
7. Testar instalação, inicialização, rede, controles e retorno ao menu no PS4 com GoldHEN.
8. Documentar compatibilidade real por firmware e versão.

## Critérios para considerar o PKG pronto

- O EBOOT foi compilado para PS4, não para Windows/Linux.
- O pacote foi gerado pelas ferramentas da toolchain.
- O pacote instala e inicia no hardware de teste.
- Controles, rede e downloads foram testados.
- Os arquivos distribuídos têm licença/autorização adequada.

## Segurança e distribuição

Não inclua chaves privadas, dumps de SDK, conteúdo protegido por direitos autorais ou pacotes de terceiros sem autorização. Use HTTPS e publique apenas homebrews e arquivos que você tem direito de redistribuir.

## Próximo passo técnico

O próximo marco é preparar o ambiente OpenOrbis no Windows e compilar um EBOOT de teste. Somente depois disso faz sentido implementar a loja nativa e automatizar a geração do PKG.
