import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const repoRoot = fileURLToPath(new URL('../', import.meta.url));
const catalog = JSON.parse(await readFile(new URL('../catalog/catalog.json', import.meta.url), 'utf8'));
const localCovers = [...new Set(catalog
  .map((item) => item.imageUrl)
  .filter((url) => typeof url === 'string' && url.startsWith('assets/'))
)];
assert.ok(localCovers.length > 0, 'O catálogo deve conter capas locais.');

const portServer = createServer();
await new Promise((resolve, reject) => {
  portServer.once('error', reject);
  portServer.listen(0, '127.0.0.1', resolve);
});
const { port } = portServer.address();
await new Promise((resolve) => portServer.close(resolve));

const child = spawn(process.execPath, [
  'serve_local.js', '--host', '127.0.0.1', '--port', String(port),
], { cwd: repoRoot, stdio: 'ignore' });

const baseUrl = `http://127.0.0.1:${port}/`;
let ready = false;
try {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`Servidor encerrou com código ${child.exitCode}.`);
    try {
      const response = await fetch(baseUrl);
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {
      // O servidor ainda pode estar iniciando.
    }
    await delay(100);
  }
  assert.ok(ready, 'O servidor local não iniciou dentro do tempo esperado.');

  const imageTypes = new Map([
    ['.jpg', 'image/jpeg'],
    ['.jpeg', 'image/jpeg'],
    ['.png', 'image/png'],
    ['.webp', 'image/webp'],
    ['.avif', 'image/avif'],
    ['.svg', 'image/svg+xml']
  ]);

  for (const cover of localCovers) {
    const response = await fetch(new URL(cover, baseUrl));
    assert.equal(response.status, 200, `A capa local não foi servida: ${cover}`);
    assert.ok(Number(response.headers.get('content-length')) > 0, `A capa está vazia: ${cover}`);

    const pathname = cover.split(/[?#]/, 1)[0];
    const extension = pathname.slice(pathname.lastIndexOf('.')).toLowerCase();
    const expectedType = imageTypes.get(extension);
    assert.ok(expectedType, `Formato de imagem não reconhecido no catálogo: ${cover}`);
    assert.ok(
      (response.headers.get('content-type') || '').startsWith(expectedType),
      `Content-Type incorreto para ${cover}: ${response.headers.get('content-type')}`
    );

    const bytes = Buffer.from(await response.arrayBuffer());
    assert.ok(bytes.length > 0, `A imagem não possui conteúdo: ${cover}`);
    if (extension === '.jpg' || extension === '.jpeg') {
      assert.ok(bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
        `Assinatura JPEG inválida: ${cover}`);
    } else if (extension === '.png') {
      assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a',
        `Assinatura PNG inválida: ${cover}`);
    } else if (extension === '.webp') {
      assert.equal(bytes.subarray(0, 4).toString('ascii'), 'RIFF',
        `Cabeçalho RIFF inválido: ${cover}`);
      assert.equal(bytes.subarray(8, 12).toString('ascii'), 'WEBP',
        `Assinatura WEBP inválida: ${cover}`);
    } else if (extension === '.avif') {
      assert.equal(bytes.subarray(4, 8).toString('ascii'), 'ftyp',
        `Contêiner AVIF inválido: ${cover}`);
      assert.match(bytes.subarray(8, 32).toString('ascii'), /avif|avis/,
        `Marca AVIF não encontrada: ${cover}`);
    } else if (extension === '.svg') {
      assert.match(bytes.toString('utf8', 0, Math.min(bytes.length, 2048)), /<svg\b/i,
        `Documento SVG inválido: ${cover}`);
    }
  }

  const pngCovers = localCovers.filter((cover) => cover.startsWith('assets/covers/official/') && cover.endsWith('.png'));
  assert.ok(pngCovers.length > 0, 'O catálogo precisa exercitar a rota de capas PNG oficiais.');

  const head = await fetch(new URL(pngCovers[0], baseUrl), { method: 'HEAD' });
  assert.equal(head.status, 200, 'HEAD deve funcionar para capas PNG.');
  assert.equal(head.headers.get('content-type'), 'image/png');

  const unsupportedMethod = await fetch(baseUrl, { method: 'POST' });
  assert.equal(unsupportedMethod.status, 405, 'Métodos diferentes de GET/HEAD devem ser recusados.');

  const traversal = await fetch(`${baseUrl}assets/covers/..%2f..%2fREADME.md`);
  assert.equal(traversal.status, 404, 'O servidor não deve expor arquivos fora da lista de rotas.');

  const unknownCover = await fetch(`${baseUrl}assets/covers/official/ps4-999.png`);
  assert.equal(unknownCover.status, 404, 'Capas fora da lista permitida devem retornar 404.');

  console.log(`Servidor local validado: ${localCovers.length} imagens locais, MIME e assinaturas, PNG, HEAD, método HTTP e rota inválida.`);
} finally {
  child.kill();
}
