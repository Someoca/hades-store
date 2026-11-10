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
const forceIds = new Set(process.argv.slice(2));
let downloaded = 0;
const failures = [];
const pending = [];

for (const source of sources) {
  const item = byId.get(source.id);
  if (!item) continue;
  // Preserve already downloaded local artwork so refreshes only fetch missing covers.
  if (!forceIds.has(item.id) && item.imageUrl?.startsWith('assets/covers/') && item.imageUrl !== 'assets/covers/game-cover.svg') {
    try { await fs.access(path.join(root, item.imageUrl)); continue; } catch { /* Fetch a missing local file. */ }
  }
  pending.push({ source, item });
}

async function download({ source, item }) {
  if (!/^https:\/\//i.test(source.url) || !/^[a-z0-9-]+$/i.test(source.id)) {
    failures.push(source.id + ': fonte ou ID inválido');
    return;
  }

  let bytes;
  let lastError;
  for (let attempt = 0; attempt < 1; attempt += 1) {
    try {
      const response = await fetch(source.url, {
        redirect: 'follow',
        signal: AbortSignal.timeout(8000),
        headers: {
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36',
          'accept': 'image/jpeg,image/png,image/webp,*/*;q=0.8',
          'referer': 'https://store.playstation.com/'
        }
      });
      const type = response.headers.get('content-type') || '';
      if (!response.ok || !type.toLowerCase().startsWith('image/')) {
        throw new Error('HTTP ' + response.status + ' (' + type + ')');
      }

      const candidate = Buffer.from(await response.arrayBuffer());
      const isJpeg = candidate[0] === 0xff && candidate[1] === 0xd8;
      const isPng = candidate.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      const isWebp = candidate.subarray(0, 4).toString('ascii') === 'RIFF' && candidate.subarray(8, 12).toString('ascii') === 'WEBP';
      const isAvif = candidate.subarray(4, 8).toString('ascii') === 'ftyp' && candidate.subarray(8, 12).toString('ascii').includes('avi');
      if (candidate.length < 1000 || (!isJpeg && !isPng && !isWebp && !isAvif)) {
        throw new Error('resposta não parece ser uma imagem de capa válida');
      }
      bytes = candidate;
      break;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await pause([3000, 8000, 20000][attempt]);
    }
  }

  if (!bytes) {
    failures.push(source.id + ': ' + lastError.message);
    console.warn('Ignorada ' + source.id + ': ' + lastError.message);
    return;
  }

  const extension = bytes[0] === 0xff ? 'jpg'
    : bytes.subarray(0, 4).toString('ascii') === 'RIFF' ? 'webp'
      : bytes.subarray(4, 8).toString('ascii') === 'ftyp' ? 'avif' : 'png';
  const relativePath = 'assets/covers/official/' + source.id + '-cover.' + extension;
  const absolutePath = path.join(root, relativePath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, bytes);
  item.imageUrl = relativePath;
  await fs.rm(path.join(root, 'assets/covers/fallback', source.id + '.svg'), { force: true });
  downloaded += 1;
  console.log('Baixada ' + source.id);
}

let cursor = 0;
await Promise.all(Array.from({ length: Math.min(6, pending.length) }, async () => {
  while (cursor < pending.length) {
    const index = cursor++;
    await download(pending[index]);
    await pause(400);
  }
}));

if (downloaded) await fs.writeFile(catalogPath, JSON.stringify(catalog, null, 2) + '\n', 'utf8');
if (failures.length) {
  console.error('Falha ao baixar ' + failures.length + ' capas:');
  for (const failure of failures) console.error(' - ' + failure);
  process.exitCode = 1;
} else {
  console.log('Capas reais baixadas e catalogadas: ' + downloaded);
}

// Refresh trigger: app/emulator art and unused fallback cleanup are part of this cover pipeline.
