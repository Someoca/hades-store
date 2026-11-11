import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const catalogPath = new URL('../catalog/catalog.json', import.meta.url);
const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
const allowedCategories = new Set(['Jogos', 'Aplicativos', 'Homebrews', 'Emuladores']);
const errors = [];
const ids = new Set();

if (!Array.isArray(catalog)) throw new Error('catalog/catalog.json precisa conter uma lista.');

for (const [index, item] of catalog.entries()) {
  const label = 'Item ' + (index + 1) + (item?.name ? ' (' + item.name + ')' : '');
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    errors.push(label + ': registro inválido.');
    continue;
  }
  for (const field of ['id', 'name', 'category', 'description']) {
    if (typeof item[field] !== 'string' || !item[field].trim()) errors.push(label + ': campo ' + field + ' ausente.');
  }
  if (item.id) {
    if (ids.has(item.id)) errors.push(label + ': ID duplicado "' + item.id + '".');
    ids.add(item.id);
  }
  if (item.category && !allowedCategories.has(item.category)) errors.push(label + ': categoria desconhecida "' + item.category + '".');
  if (item.downloadUrl !== undefined && (typeof item.downloadUrl !== 'string' || !/^https:\/\//i.test(item.downloadUrl))) {
    errors.push(label + ': downloadUrl, quando informado, precisa ser uma URL HTTPS.');
  }
  if (item.category === 'Jogos' && Array.isArray(item.packageLinks)) {
    const seenUrls = new Set();
    for (const [linkIndex, link] of item.packageLinks.entries()) {
      if (!link || typeof link.label !== 'string' || !link.label.trim() || typeof link.url !== 'string' || !/^https:\/\//i.test(link.url)) {
        errors.push(label + ': packageLinks[' + linkIndex + '] precisa conter label e URL HTTPS.');
      } else if (seenUrls.has(link.url)) {
        errors.push(label + ': packageLinks[' + linkIndex + '] possui URL duplicada (' + link.url + ').');
      } else {
        seenUrls.add(link.url);
      }
    }
  }

  if (typeof item.imageUrl !== 'string' || !item.imageUrl.trim()) {
    errors.push(label + ': imageUrl ausente.');
  } else if (item.category === 'Jogos' && /(?:^|\\/)fallback\\//i.test(item.imageUrl)) {
    errors.push(label + ': capa genérica de fallback não permitida.');
  } else if (/^https:\/\//i.test(item.imageUrl)) {
    // Remote cover from an HTTPS image host.
  } else {
    const imagePath = resolve(root, item.imageUrl);
    const relativePath = relative(root, imagePath);
    if (!item.imageUrl.startsWith('assets/') || relativePath.startsWith('..' + sep) || relativePath === '..' || !existsSync(imagePath)) {
      errors.push(label + ': imageUrl precisa ser HTTPS ou apontar para um arquivo local existente em assets/.');
    }
  }
}

if (errors.length) {
  console.error('Falha na validação do catálogo:');
  for (const error of errors) console.error(' - ' + error);
  process.exitCode = 1;
} else {
  const counts = Object.fromEntries([...allowedCategories].map((category) => [
    category, catalog.filter((item) => item.category === category).length
  ]));
  console.log('Catálogo válido: ' + catalog.length + ' itens; ' + ids.size + ' IDs únicos.');
  console.log(counts);
}
