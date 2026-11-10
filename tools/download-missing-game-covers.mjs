import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalogPath = path.join(root, 'catalog/catalog.json');
const catalog = JSON.parse(await fs.readFile(catalogPath, 'utf8'));
const missing = catalog.filter((item) =>
  item.category === 'Jogos' &&
  (!item.imageUrl || item.imageUrl.includes('/fallback/') || item.imageUrl.endsWith('/game-cover.svg'))
);

const normalize = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[®™©]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()
  .replace(/\s+/g, ' ');

function platformText(product) {
  const values = [
    ...(Array.isArray(product.playable_platform) ? product.playable_platform : []),
    ...(product.metadata?.playable_platform?.values || []),
    ...(product.default_sku?.entitlements || []).flatMap((entitlement) =>
      (entitlement.packages || []).map((pkg) => pkg.platformName || '')
    ),
  ];
  return values.join(' ').toUpperCase();
}

function titleScore(item, product) {
  const wanted = new Set([normalize(item.name), normalize(item.storeTitle)].filter(Boolean));
  const names = [product.name, product.short_name, product.parent_name]
    .map(normalize)
    .filter(Boolean);
  let best = 0;
  for (const target of wanted) {
    for (const name of names) {
      const stripped = name.replace(/\b(ps4|ps5|playstation 4|playstation 5)\b/g, '').trim();
      if (stripped === target) best = Math.max(best, 100);
      else if (stripped.startsWith(target + ' ')) best = Math.max(best, 88);
      else if (stripped.includes(' ' + target + ' ')) best = Math.max(best, 82);
    }
  }
  return best;
}

async function searchProduct(item) {
  const queries = [...new Set([item.storeTitle, item.name]
    .filter(Boolean)
    .map((value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()))];
  const targetPlatform = /PS5/i.test(item.version || '') ? 'PS5' : 'PS4';
  let products = [];

  for (const query of queries) {
    const pathQuery = encodeURIComponent(query.replace(/\s+/g, '_'));
    const endpoint = `https://store.playstation.com/store/api/chihiro/00_09_000/tumbler/US/en/999/${pathQuery}?suggested_size=50&mode=game`;
    let response;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        response = await fetch(endpoint, {
          headers: { accept: 'application/json', 'user-agent': 'Mozilla/5.0 HADESStoreCoverRefresh/1.0' },
          signal: AbortSignal.timeout(15000),
        });
        if (response.ok) break;
        throw new Error(`HTTP ${response.status}`);
      } catch (error) {
        if (attempt === 2) console.warn(`Busca falhou para ${item.id}: ${error.message}`);
        await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)));
      }
    }
    if (!response?.ok) continue;
    const data = await response.json();
    products = data.links || [];
    if (products.some((product) => titleScore(item, product) >= 82)) break;
  }

  const ranked = products
    .map((product) => {
      const platforms = platformText(product);
      const platformMatch = platforms.includes(targetPlatform);
      const score = titleScore(item, product);
      const cover = (product.images || []).find((image) => image.type === 10)?.url;
      return { product, score, platformMatch, cover };
    })
    .filter((result) => result.score >= 82 && result.cover)
    .sort((a, b) => Number(b.platformMatch) - Number(a.platformMatch) || b.score - a.score);

  return ranked[0] || null;
}

async function downloadCover(item, result) {
  const response = await fetch(result.cover, {
    headers: { accept: 'image/*', 'user-agent': 'Mozilla/5.0 HADESStoreCoverRefresh/1.0' },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok || !response.headers.get('content-type')?.toLowerCase().startsWith('image/')) {
    throw new Error(`capa indisponível (${response.status})`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  const isPng = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
  const isWebp = bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
  if (bytes.length < 1000 || (!isPng && !isJpeg && !isWebp)) throw new Error('a resposta não é uma capa válida');

  const extension = isPng ? 'png' : isJpeg ? 'jpg' : 'webp';
  const relativePath = `assets/covers/official/${item.id}-cover.${extension}`;
  const destination = path.join(root, relativePath);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, bytes);
  item.imageUrl = relativePath;
  return relativePath;
}

let downloaded = 0;
const unresolved = [];
for (const item of missing) {
  try {
    const result = await searchProduct(item);
    if (!result) {
      unresolved.push(item.id);
      console.warn(`Sem correspondência segura na PlayStation Store: ${item.name}`);
      continue;
    }
    const relativePath = await downloadCover(item, result);
    downloaded += 1;
    console.log(`Capa oficial baixada: ${item.name} (${result.product.name}) -> ${relativePath}`);
  } catch (error) {
    unresolved.push(item.id);
    console.warn(`Não foi possível baixar ${item.name}: ${error.message}`);
  }
  await new Promise((resolve) => setTimeout(resolve, 250));
}

if (downloaded) await fs.writeFile(catalogPath, JSON.stringify(catalog, null, 2) + '\n', 'utf8');
console.log(`Capas oficiais baixadas: ${downloaded}/${missing.length}. Pendentes: ${unresolved.length}.`);
