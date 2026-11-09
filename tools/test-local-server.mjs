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

  for (const cover of localCovers) {
    const response = await fetch(new URL(cover, baseUrl));
    assert.equal(response.status, 200, `A capa local não foi servida: ${cover}`);
    assert.ok(Number(response.headers.get('content-length')) > 0, `A capa está vazia: ${cover}`);
    await response.arrayBuffer();
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

  console.log(`Servidor local validado: ${localCovers.length} capas locais, PNG, HEAD, método HTTP e rota inválida.`);
} finally {
  child.kill();
}
