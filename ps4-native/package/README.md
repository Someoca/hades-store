# Estrutura de recursos do pacote HADES Store

Esta pasta separa os metadados declarativos dos arquivos binarios que serao gerados nas etapas de build e empacotamento.

## Arquivos esperados

| Caminho relativo a `ps4-native/` | Funcao | Origem |
|---|---|---|
| `build/HADES.elf` | Executavel ELF intermediario | Gerado pelo driver de build |
| `package/eboot.bin` | Executavel FSELF destinado ao pacote | Gerado futuramente por `create-fself.exe` |
| `package/sce_sys/icon0.png` | Icone do aplicativo | Arte final a ser fornecida/criada |
| `package/package-metadata.example.json` | Modelo de metadados | Versionado no repositorio |
| `package/resources-manifest.example.json` | Lista declarativa de recursos | Versionado no repositorio |

Os caminhos sao uma estrutura de preparacao, nao uma declaracao de que os arquivos binarios ja existem.

## Regras

- O executavel do pacote deve ser exatamente o caminho declarado em `package-metadata.example.json`.
- O icone deve existir no caminho declarado e ser um PNG valido antes de gerar o pacote.
- Nao incluir o ELF intermediario no pacote final como substituto de FSELF.
- Nao criar `param.sfo`, GP4 ou PKG com Title ID, Content ID ou versao de sistema provisoria.
- Confirmar os requisitos de dimensao/formato do icone e o layout GP4 com a documentacao da mesma release OpenOrbis instalada antes de automatizar essas etapas.

## Validacao local

A partir da pasta `ps4-native`, execute:

```powershell
.\tools\validate-package-resources.ps1
```

O validador verifica a consistencia entre o manifesto, os metadados e a existencia dos arquivos. Ele nao valida o conteudo binario do FSELF, nao inspeciona o PNG e nao gera artefatos.
