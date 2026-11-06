# HADES Store — plano de implementação nativa PS4

Este diretório é o aplicativo nativo PS4. A loja web na raiz é um projeto separado.

## Estado do trabalho

- [x] Branch isolado `native/ps4-bootstrap`.
- [x] Diagnóstico dos artefatos de teste e seus limites registrado.
- [x] Ponto de entrada mínimo baseado no padrão libkernel do sample OpenOrbis.
- [ ] Compilar o novo código no Windows com a toolchain OpenOrbis instalada.
- [ ] Inspecionar ELF/OELF/SELF com ferramentas PS4-aware.
- [ ] Gerar PKG com identidade HADES própria e validar metadados, estrutura e hashes.
- [ ] Testar instalação e inicialização no PS4 alvo.
- [ ] Implementar UI gráfica nativa com APIs verificadas.
- [ ] Implementar navegação DualShock 4.
- [ ] Implementar catálogo HTTPS e validação de JSON.
- [ ] Implementar downloads com limites e verificação de integridade.

## Decisão técnica

Não reutilizar nem instalar PKGs de teste como se fossem aplicativos prontos. O código gráfico Mandelbrot local depende de `Scene2D`, `graphics.h` e `log.h`; essas dependências ainda não foram confirmadas. O `build.bat` local continua com metadados Hello World. Portanto, não portar esse código gráfico nem reutilizar seus artefatos no pacote HADES nesta etapa.

O bootstrap atual usa apenas o padrão libkernel observado no Hello World oficial. Ainda precisa ser compilado e testado localmente.

## Marcos e critérios de aceite

1. **Ambiente** — detectar a toolchain OpenOrbis e registrar versões/caminhos dos utilitários.
2. **Hello World oficial** — compilar sem alterações um exemplo oficial e preservar o log completo.
3. **Bootstrap HADES** — compilar este ponto de entrada mínimo sem APIs gráficas presumidas.
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
