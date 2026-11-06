# HADES Catalog Schema v1

O documento remoto deve ser servido por HTTPS e usar UTF-8.

## Raiz

- `schemaVersion`: numero inteiro igual a `1`.
- `items`: array com no maximo 500 objetos.

## Campos por item

| Campo | Tipo | Regra |
|---|---|---|
| id | string | Obrigatorio, 1–64 caracteres, unico |
| title | string | Obrigatorio, 1–96 caracteres |
| description | string | Opcional, ate 512 caracteres |
| version | string | Opcional, ate 32 caracteres |
| author | string | Opcional, ate 64 caracteres |
| type | string | homebrew, utility, emulator ou game |
| featured | boolean | Opcional |
| packageUrl | string | Opcional; se informado, precisa comecar com https:// |
| sha256 | string | Obrigatorio com 64 hexadecimais quando packageUrl nao estiver vazio |
| packageSize | number | Ate 4 GiB |

## Limites do parser

- Documento: 1 MiB.
- Profundidade: 24 niveis.
- Nos: 20.000.
- Itens: 500.
- Chaves duplicadas sao rejeitadas.
- Campos desconhecidos sao ignorados para permitir evolucao compatível.

## Exemplo

Consulte `catalog-v1.example.json`.

O parser valida o documento e o modelo de catalogo, mas a autenticidade do catalogo remoto ainda depende da conexao HTTPS validada e de uma politica de origem confiavel. O hash do pacote so sera confirmado no download, calculando-o sobre os bytes recebidos.
