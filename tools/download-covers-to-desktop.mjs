import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalogPath = path.join(root, 'catalog/catalog.json');
const catalog = JSON.parse(await fs.readFile(catalogPath, 'utf8'));

async function desktopPath() {
  const oneDrive = process.env.OneDrive || process.env.OneDriveConsumer || process.env.OneDriveCommercial;
  const home = os.homedir();
  const candidates = [
    oneDrive && path.join(oneDrive, 'Desktop'),
    process.env.USERPROFILE && path.join(process.env.USERPROFILE, 'Desktop'),
    path.join(home, 'OneDrive', 'Desktop'),
    path.join(home, 'Desktop')
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      if ((await fs.stat(candidate)).isDirectory()) return candidate;
    } catch {
      // Try the next common Windows or Linux Desktop location.
    }
  }
  return candidates[0] || path.join(home, 'Desktop');
}

function outputArgument(args) {
  const index = args.indexOf('--output');
  if (index !== -1) {
    if (!args[index + 1]) throw new Error('Informe uma pasta depois de --output.');
    return args[index + 1];
  }
  const value = args.find((arg) => arg.startsWith('--output='));
  return value?.slice('--output='.length);
}

function slug(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'capa';
}

function extensionFor(source, contentType = '') {
  const pathname = source instanceof URL ? source.pathname : source;
  const extension = path.extname(pathname).toLowerCase();
  if (/^\.[a-z0-9]{1,5}$/.test(extension)) return extension;
  const mimeExtensions = new Map([
    ['image/avif', '.avif'],
    ['image/jpeg', '.jpg'],
    ['image/png', '.png'],
    ['image/svg+xml', '.svg'],
    ['image/webp', '.webp']
  ]);
  return mimeExtensions.get(contentType.split(';')[0].trim().toLowerCase()) || '.img';
}

async function sourceFor(item) {
  if (typeof item.imageUrl !== 'string' || !item.imageUrl.trim()) {
    throw new Error('o item não tem imageUrl');
  }
  if (/^https:\/\//i.test(item.imageUrl)) return new URL(item.imageUrl);
  if (!item.imageUrl.startsWith('assets/')) throw new Error('imageUrl local fora de assets/');

  const source = path.resolve(root, item.imageUrl);
  const relative = path.relative(root, source);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('imageUrl fora do projeto');
  await fs.access(source);
  return source;
}

async function copyCover(item, outputDir) {
  const source = await sourceFor(item);
  if (source instanceof URL) {
    const response = await fetch(source, { redirect: 'follow' });
    if (!response.ok) throw new Error(`download respondeu HTTP ${response.status}`);
    const contentType = response.headers.get('content-type') || '';
    if (contentType && !/^image\//i.test(contentType) && !/^application\/octet-stream/i.test(contentType)) {
      throw new Error(`tipo de conteúdo inesperado: ${contentType}`);
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.length) throw new Error('a resposta veio vazia');
    const remoteExtension = extensionFor(source, contentType);
    const target = path.join(outputDir, `${slug(item.id)}-${slug(item.name)}${remoteExtension}`);
    await fs.writeFile(target, bytes);
    return target;
  }

  const filename = `${slug(item.id)}-${slug(item.name)}${extensionFor(source)}`;
  const destination = path.join(outputDir, filename);
  await fs.copyFile(source, destination);
  return destination;
}

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log('Uso: node tools/download-covers-to-desktop.mjs [--output <pasta>]');
  console.log('Por padrão, salva as capas em “HADES Store Capinhas” na Área de Trabalho.');
  process.exit(0);
}

const requestedOutput = outputArgument(args) || process.env.HADES_COVERS_OUTPUT;
const outputDir = path.resolve(requestedOutput || path.join(await desktopPath(), 'HADES Store Capinhas'));
await fs.mkdir(outputDir, { recursive: true });

const items = catalog.filter((item) => item && typeof item.imageUrl === 'string' && item.imageUrl.trim());
let completed = 0;
const failures = [];
for (const item of items) {
  try {
    await copyCover(item, outputDir);
    completed += 1;
  } catch (error) {
    failures.push(`${item.name || item.id}: ${error.message}`);
  }
}

console.log(`Capinhas salvas na Área de Trabalho: ${completed}/${items.length}`);
console.log(`Pasta: ${outputDir}`);
if (failures.length) {
  console.error(`Falhas (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
}
