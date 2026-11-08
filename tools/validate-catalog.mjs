import { readFile } from 'node:fs/promises';

const catalogPath = new URL('../catalog/catalog.json', import.meta.url);
const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
const allowedCategories = new Set(['Jogos', 'Aplicativos', 'Homebrews', 'Emuladores']);
const errors = [];
const ids = new Set();

if (!Array.isArray(catalog)) throw new Error('catalog/catalog.json precisa conter uma lista.');

for (const [index, item] of catalog.entries()) {
  const label = 'Item ' + (index + 1) + (item?.name ? ' (' + item.name + ')' : '');
  if (!item || typeof item !== 'object') {
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
  for (const field of ['downloadUrl', 'imageUrl']) {
    if (typeof item[field] !== 'string' || !/^https:\/\//i.test(item[field])) {
      errors.push(label + ': ' + field + ' precisa ser uma URL HTTPS.');
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
