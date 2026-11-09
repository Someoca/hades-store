import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalogPath = path.join(root, 'catalog/catalog.json');
const sourcesPath = path.join(root, 'tools/cover-sources.json');
const catalog = JSON.parse(await fs.readFile(catalogPath, 'utf8'));
const sources = JSON.parse(await fs.readFile(sourcesPath, 'utf8'));
const byId = new Map(catalog.map((item) => [item.id, item]));
const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
let downloaded = 0;
const failures = [];

for (const source of sources) {
  const item = byId.get(source.id);
  if (!item) continue;
  if (!/^https:\/\//i.test(source.url) || !/^[a-z0-9-]+$/i.test(source.id)) {
    failures.push(source.id + ': fonte ou ID inválido');
    continue;
  }

  let bytes;
  let lastError;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const response = await fetch(source.url, {
        redirect: 'follow',
        headers: {
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36',
          'accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
          'referer': 'https://store.playstation.com/'
        }
      });
      const type = response.headers.get('content-type') || '';
      if (!response.ok || !type.toLowerCase().startsWith('image/')) {
        throw new Error('HTTP ' + response.status + ' (' + type + ')');
      }

      bytes = Buffer.from(await response.arrayBuffer());
      const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
      const isPng = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      if (bytes.length < 5000 || (!isJpeg && !isPng)) {
        throw new Error('resposta não parece ser uma capa JPEG/PNG válida');
      }
      break;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await pause([3000, 8000, 20000][attempt]);
    }
  }

  if (!bytes) {
    failures.push(source.id + ': ' + lastError.message);
    continue;
  }

  const extension = bytes[0] === 0xff ? 'jpg' : 'png';
  const relativePath = 'assets/covers/official/' + source.id + '-cover.' + extension;
  const absolutePath = path.join(root, relativePath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, bytes);
  item.imageUrl = relativePath;
  await fs.rm(path.join(root, 'assets/covers/fallback', source.id + '.svg'), { force: true });
  downloaded += 1;

  // PlayStation Store may throttle burst downloads from CI runner IPs.
  await pause(650);
  if (downloaded && downloaded % 25 === 0) await pause(5000);
}

if (failures.length) {
  console.error('Falha ao baixar ' + failures.length + ' capas:');
  for (const failure of failures) console.error(' - ' + failure);
  process.exitCode = 1;
} else {
  await fs.writeFile(catalogPath, JSON.stringify(catalog, null, 2) + '\n', 'utf8');
  console.log('Capas reais baixadas e catalogadas: ' + downloaded);
}

// Refresh trigger: app/emulator art and unused fallback cleanup are part of this cover pipeline.
