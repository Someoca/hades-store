# HADES Store — navegação e downloads seguros

## Regras de preservação do catálogo

- `catalog/catalog.json` é a fonte de dados compartilhada pelo site e pelo aplicativo nativo.
- A migração do catálogo direciona `downloadUrl`, `packageLinks` e `storeProductUrl` dos jogos para o novo site. Os links de pacote são consolidados em uma única ação para evitar botões duplicados; aplicativos e emuladores não são alterados.
- Recursos de download novos devem ser aditivos e limitados a homebrews e aplicativos cuja distribuição seja autorizada.
- Não converter links de jogos em URLs de download direto.

## Estado atual da navegação nativa

O aplicativo já possui tela inicial, filtros de Jogos/Aplicativos/Emuladores, grade paginada, busca por texto, detalhes, favoritos persistidos e navegação por DualShock 4. Os rótulos laterais DOWNLOADS e CONFIGURAÇÕES ainda não representam telas completas; não devem indicar funcionalidades prontas antes de sua implementação.

Próximas melhorias de navegação:
1. Implementar foco visual e seleção consistente entre início, catálogo, busca, favoritos, downloads e configurações.
2. Garantir que B/O volte um nível sem encerrar o aplicativo inesperadamente; manter uma ação explícita para sair.
3. Exibir estados vazios, carregamento e erros sem travar a navegação.
4. Testar direcional, analógicos, X/A, O/B, L1/R1, L3/R3 e teclado virtual.

## Arquitetura proposta para downloads autorizados

A fila de downloads deve ser independente do catálogo de jogos e receber apenas itens explicitamente marcados como distribuíveis. Cada item elegível deve ter metadados próprios: identificador, URL HTTPS oficial, tamanho máximo esperado e SHA-256 publicado por fonte confiável.

Fluxo obrigatório:
1. Validar esquema HTTPS, hostname permitido por lista de hosts oficiais e tamanho da URL.
2. Seguir redirecionamentos somente se permanecerem em HTTPS e em host permitido.
3. Validar certificado TLS; nunca desabilitar verificação SSL.
4. Exigir resposta HTTP de sucesso, conferir Content-Length quando disponível e impor limite de bytes.
5. Baixar para arquivo temporário `.part`, permitir cancelamento e informar progresso.
6. Calcular SHA-256 e comparar com o valor confiável dos metadados.
7. Somente após validação, renomear atomicamente para o arquivo final; apagar temporários em falhas.
8. Verificar espaço livre antes do início e nunca executar ou instalar automaticamente um pacote baixado.

## Critérios de aceite

- Todos os campos de link dos jogos direcionam ao novo site, e cada item tem no máximo uma ação de pacote.
- Links de aplicativos e emuladores permanecem inalterados.
- Os fluxos de navegação não bloqueiam a interface e sempre permitem voltar.
- Download só é habilitado para homebrew/aplicativo com distribuição autorizada, host permitido e hash esperado.
- Certificados TLS são verificados; falhas deixam o arquivo final indisponível.
- Build automatizado aprovado não substitui teste real no PS4 com firmware e ambiente compatíveis.

## Limitação técnica a resolver antes do downloader

O build atual usa OpenOrbis Toolchain v0.5.1 e SDL2. Antes de implementar rede nativa, é necessário confirmar quais headers, bibliotecas e APIs de rede/SSL estão realmente presentes nessa versão do SDK. Não copiar exemplos que ignorem validação SSL nem assumir compatibilidade com outra versão da toolchain.
