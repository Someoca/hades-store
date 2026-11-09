import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalogPath = path.join(root, 'catalog/catalog.json');
const sourcesPath = path.join(root, 'tools/cover-sources.json');
const catalog = JSON.parse(await fs.readFile(catalogPath, 'utf8'));
const sources = JSON.parse(await fs.readFile(sourcesPath, 'utf8'));
const byId = new Map(catalog.map((item) => [item.id, item]));
let cursor = 0;
let downloaded = 0;
const failures = [];

async function worker() {
  while (cursor < sources.length) {
    const source = sources[cursor++];
    const item = byId.get(source.id);
    if (!item) continue;
    if (!/^https:\/\//i.test(source.url) || !/^[a-z0-9-]+$/i.test(source.id)) {
      failures.push(source.id + ': fonte ou ID inválido');
      continue;
    }

    try {
      const response = await fetch(source.url, {
        redirect: 'follow',
        headers: { 'user-agent': 'HADES-Store-Cover-Refresh/1.0' }
      });
      const type = response.headers.get('content-type') || '';
      if (!response.ok || !type.toLowerCase().startsWith('image/')) {
        throw new Error('HTTP ' + response.status + ' (' + type + ')');
      }

      const bytes = Buffer.from(await response.arrayBuffer());
      const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
      const isPng = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      if (bytes.length < 5000 || (!isJpeg && !isPng)) {
        throw new Error('resposta não parece ser uma capa JPEG/PNG válida');
      }

      const extension = isJpeg ? 'jpg' : 'png';
      const relativePath = 'assets/covers/official/' + source.id + '-cover.' + extension;
      const absolutePath = path.join(root, relativePath);
      await fs.mkdir(path.dirname(absolutePath), { recursive: true });
      await fs.writeFile(absolutePath, bytes);
      item.imageUrl = relativePath;

      const oldFallback = path.join(root, 'assets/covers/fallback', source.id + '.svg');
      await fs.rm(oldFallback, { force: true });
      downloaded += 1;
    } catch (error) {
      failures.push(source.id + ': ' + error.message);
    }
  }
}

await Promise.all(Array.from({ length: 8 }, worker));
if (failures.length) {
  console.error('Falha ao baixar ' + failures.length + ' capas:');
  for (const failure of failures) console.error(' - ' + failure);
  process.exitCode = 1;
} else {
  await fs.writeFile(catalogPath, JSON.stringify(catalog, null, 2) + '\n', 'utf8');
  console.log('Capas reais baixadas e catalogadas: ' + downloaded);
}
