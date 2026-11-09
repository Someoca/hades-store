import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalogPath = path.join(root, 'catalog/catalog.json');
const catalog = JSON.parse(await fs.readFile(catalogPath, 'utf8'));

const nameFixes = {
  'pkg-029-fatal-frame-maiden-of-black-wate': 'Fatal Frame Maiden of Black Water',
  'pkg-085-harvest-moon-back-back-to-nature': 'Harvest Moon: Back to Nature',
  'pkg-440-gta-san-andreas-the-definitive-edition-edi': 'GTA San Andreas The Definitive Edition',
};

let updatedCount = 0;

for (const item of catalog) {
  let changed = false;

  if (nameFixes[item.id] && item.name !== nameFixes[item.id]) {
    item.name = nameFixes[item.id];
    changed = true;
  }

  if (typeof item.size === 'string' && item.size.includes(',')) {
    item.size = item.size.replace(/(\d+),(\d+)/g, '$1.$2');
    changed = true;
  }

  if (
    typeof item.id === 'string' &&
    item.id.startsWith('ps4-extra-') &&
    Array.isArray(item.packageLinks) &&
    item.packageLinks.length > 0 &&
    item.format?.includes('esta página não fornece PKG')
  ) {
    item.format = 'PKG somente se disponível por fonte autorizada';
    changed = true;
  }

  if (item.id === 'app-avatar-changer' && item.imageUrl === 'assets/covers/apps/app-avatar-changer.png') {
    item.imageUrl = 'assets/covers/apps/app-avatar-changer.svg';
    changed = true;
  }

  if (Array.isArray(item.packageLinks)) {
    const seenUrls = new Set();
    const filteredLinks = item.packageLinks.filter((entry) => {
      if (!entry || typeof entry.url !== 'string') return false;
      if (seenUrls.has(entry.url)) return false;
      seenUrls.add(entry.url);
      return true;
    });
    if (filteredLinks.length !== item.packageLinks.length) {
      item.packageLinks = filteredLinks;
      changed = true;
    }
  }

  if (changed) updatedCount += 1;
}

await fs.writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
console.log(`Catálogo atualizado: ${updatedCount} itens corrigidos.`);
