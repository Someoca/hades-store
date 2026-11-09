import { readFile } from 'node:fs/promises';

const catalog = JSON.parse(await readFile(new URL('../catalog/catalog.json', import.meta.url), 'utf8'));
const grouped = new Map();

for (const item of catalog) {
  const value = item?.downloadUrl;
  if (typeof value !== 'string' || !value.trim()) continue;
  if (!grouped.has(value)) grouped.set(value, []);
  grouped.get(value).push(item);
}

const entries = [...grouped.entries()];
const concurrency = 5;
const timeoutMs = 12_000;
const results = [];
let nextIndex = 0;

async function checkUrl(url) {
  let lastError = '';
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const options = {
        method: 'HEAD',
        redirect: 'follow',
        signal: AbortSignal.timeout(timeoutMs),
        headers: { 'user-agent': 'HADES-Store-Link-Checker/1.0' },
      };
      let response = await fetch(url, options);

      if (response.status === 405 || response.status === 501) {
        await response.body?.cancel();
        response = await fetch(url, {
          ...options,
          method: 'GET',
          headers: { ...options.headers, range: 'bytes=0-0' },
        });
        await response.body?.cancel();
      } else {
        await response.body?.cancel();
      }

      if (response.status === 401 || response.status === 403 || response.status === 429) {
        return { status: 'BLOCKED', code: response.status, finalUrl: response.url };
      }
      if (response.status === 404 || response.status === 410) {
        return { status: 'BROKEN', code: response.status, finalUrl: response.url };
      }
      if (response.status >= 500 && attempt < 3) {
        lastError = 'HTTP ' + response.status;
        continue;
      }
      if (response.status >= 200 && response.status < 400) {
        return { status: 'OK', code: response.status, finalUrl: response.url };
      }
      return { status: 'INCONCLUSIVE', code: response.status, finalUrl: response.url };
    } catch (error) {
      lastError = error?.name === 'TimeoutError' ? 'timeout' : String(error?.cause?.code || error?.message || error);
      if (attempt < 3) continue;
    }
  }
  return { status: 'INCONCLUSIVE', error: lastError };
}

async function worker() {
  while (nextIndex < entries.length) {
    const index = nextIndex++;
    const [url, items] = entries[index];
    const result = await checkUrl(url);
    results[index] = { url, items, ...result };
  }
}

await Promise.all(Array.from({ length: Math.min(concurrency, entries.length) }, () => worker()));

const counts = { OK: 0, BROKEN: 0, BLOCKED: 0, INCONCLUSIVE: 0 };
for (const result of results) {
  counts[result.status] += 1;
  const labels = result.items.map((item) => item.id + ' — ' + item.name).join('; ');
  const detail = result.code ? 'HTTP ' + result.code : result.error || '';
  console.log('[' + result.status + '] ' + labels + ' | ' + detail + ' | ' + result.url);
}

console.log('');
console.log('Auditoria concluída: ' + catalog.length + ' itens, ' + entries.length + ' URLs únicas.');
console.log(counts);

const summary = [
  '# HADES Store — auditoria de links',
  '',
  '- Itens no catálogo: ' + catalog.length,
  '- URLs únicas verificadas: ' + entries.length,
  '- Acessíveis: ' + counts.OK,
  '- Quebrados (404/410): ' + counts.BROKEN,
  '- Bloqueados pelo servidor (401/403/429): ' + counts.BLOCKED,
  '- Inconclusivos: ' + counts.INCONCLUSIVE,
  '',
  'Bloqueio ou resposta inconclusiva não é classificado como link quebrado.',
  '',
  ...results.filter((item) => item.status !== 'OK').map((item) =>
    '- **' + item.status + '** — ' + item.items.map((entry) => entry.id + ' (' + entry.name + ')').join(', ') +
    ' — ' + (item.code ? 'HTTP ' + item.code : item.error || '') + ' — ' + item.url
  ),
].join('\n');

if (process.env.GITHUB_STEP_SUMMARY) {
  const { appendFile } = await import('node:fs/promises');
  await appendFile(process.env.GITHUB_STEP_SUMMARY, summary + '\n');
}

if (counts.BROKEN > 0) {
  console.error('Foram encontrados links confirmadamente quebrados.');
  process.exitCode = 1;
}
