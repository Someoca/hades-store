import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalogPath = path.join(root, 'catalog/catalog.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

const xml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const normalize = (value) =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

function buildStandardCoverSvg(item) {
  let seed = 0;
  for (const char of item.id + item.name) seed = (seed * 31 + char.charCodeAt(0)) >>> 0;
  const hue = seed % 360;
  const accent = (hue + 48 + (seed % 64)) % 360;
  const name = normalize(item.name);

  let scene = '<circle cx="256" cy="210" r="95" fill="hsl(' + accent + ',85%,70%)" opacity=".35"/><path d="M0 430 95 310l85 65 95-155 105 135 65-80 67 85v408H0Z" fill="#090d18"/>';
  if (/resident evil|evil within|horror|outlast|dead island|zombie|madison|visage|martha/.test(name)) {
    scene = '<circle cx="340" cy="180" r="78" fill="#d9a79c" opacity=".42"/><path d="M0 420 75 330l60 35 75-115 80 100 70-125 90 105 62-55v493H0Z" fill="#180f18"/><path d="M0 500 110 410l95 60 90-85 85 95 132-95v383H0Z" fill="#080a10"/>';
  } else if (/fifa|ea sports|pes |football|bomba patch|brazukas|nba|madden|ufc|f1 |gran turismo|need for speed|burnout|mxgp|supercross|dakar|crew|riders|tony hawk/.test(name)) {
    scene = '<circle cx="256" cy="195" r="110" fill="hsl(' + accent + ',90%,72%)" opacity=".38"/><path d="M0 360q256-160 512 0v408H0Z" fill="#0d172a"/><path d="M0 410q256-160 512 0M0 460q256-160 512 0" fill="none" stroke="#8ce3ff" stroke-opacity=".45" stroke-width="5"/><path d="M0 530q256-90 512 0v238H0Z" fill="#060b14"/>';
  } else if (/assassin|witcher|bloodborne|souls|nioh|sekiro|elden ring|god of war|skyrim|dragon|kingdom|ghost of tsushima|shadow of|middle earth|wo long|for honor/.test(name)) {
    scene = '<circle cx="350" cy="185" r="85" fill="hsl(' + accent + ',85%,74%)" opacity=".45"/><path d="M0 430 90 320l70 55 95-150 100 130 65-85 92 105v393H0Z" fill="#161324"/><path d="M0 510 115 415l85 60 95-90 95 100 122-95v378H0Z" fill="#070912"/>';
  } else if (/call of duty|battlefield|far cry|sniper|wolfenstein|doom|metro|crysis|watch dogs|gta|grand theft|mafia|hitman|metal gear/.test(name)) {
    scene = '<circle cx="355" cy="185" r="82" fill="#e0a96d" opacity=".4"/><path d="M0 420 95 345l80 38 65-80 95 98 70-120 107 95v392H0Z" fill="#1d1b22"/><path d="M0 505 125 435l95 32 80-52 95 66 117-55v342H0Z" fill="#080a11"/>';
  }

  const words = item.name.split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = `${line} ${word}`.trim();
    if (next.length > 18 && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);

  const fontSize = lines.some((l) => l.length > 16) ? 26 : 32;
  const titleSvg = lines
    .slice(0, 3)
    .map(
      (text, idx) =>
        `<text x="256" y="${565 + idx * 38}" text-anchor="middle" fill="#ffffff" font-family="Arial,sans-serif" font-size="${fontSize}" font-weight="900" letter-spacing="0.8">${xml(text)}</text>`
    )
    .join('');

  const code = Array.isArray(item.packageCodes) && item.packageCodes[0] ? item.packageCodes[0] : 'PS4 PKG';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 768">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="hsl(${hue},52%,24%)"/>
      <stop offset=".55" stop-color="#0b1224"/>
      <stop offset="1" stop-color="#050811"/>
    </linearGradient>
    <radialGradient id="glow">
      <stop stop-color="hsl(${accent},95%,68%)" stop-opacity=".75"/>
      <stop offset="1" stop-color="hsl(${accent},95%,40%)" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="512" height="768" fill="url(#bg)"/>
  <ellipse cx="${180 + (seed % 150)}" cy="250" rx="260" ry="280" fill="url(#glow)"/>
  ${scene}
  <rect x="20" y="20" width="472" height="728" rx="12" fill="none" stroke="hsl(${accent},85%,70%)" stroke-opacity=".55" stroke-width="2"/>
  <rect x="24" y="515" width="464" height="175" rx="10" fill="#040812" fill-opacity=".82" stroke="hsl(${accent},85%,70%)" stroke-opacity=".65"/>
  ${titleSvg}
  <text x="256" y="722" text-anchor="middle" fill="#9bc7f5" font-family="Arial,sans-serif" font-size="14" font-weight="800" letter-spacing="2.5">HADES STORE  •  ${xml(code)}</text>
</svg>`;
}

let preservedOfficial = 0;
let standardizedCount = 0;

for (const item of catalog) {
  const currentUrl = String(item.imageUrl || '');

  // 1. Mantém intactas todas as capas oficiais em assets/covers/official/
  if (currentUrl.startsWith('assets/covers/official/') && fs.existsSync(path.join(root, currentUrl))) {
    preservedOfficial += 1;
    continue;
  }

  // 2. Padroniza apps e emuladores para os SVGs oficiais criados
  if (item.category === 'Aplicativos' || item.category === 'Emuladores') {
    if (currentUrl.endsWith('.png') && item.id !== 'app-avatar-changer') {
      const svgCandidate = currentUrl.replace(/\.png$/i, '.svg');
      if (fs.existsSync(path.join(root, svgCandidate))) {
        item.imageUrl = svgCandidate;
        standardizedCount += 1;
      }
    }
    continue;
  }

  // 3. Para jogos sem capa oficial local (links externos quebrados/chihiro), gera capa local 3:4
  const isLocal = currentUrl.startsWith('assets/');
  const localExists = isLocal && fs.existsSync(path.join(root, currentUrl));
  const isPlayStationStoreApi = /^https:\/\/store\.playstation\.com\/store\/api\/chihiro\//i.test(currentUrl);
  const needsFallback = isLocal ? !localExists : isPlayStationStoreApi;

  if (needsFallback) {
    const targetRel = `assets/covers/fallback/${item.id}.svg`;
    const targetAbs = path.join(root, targetRel);
    fs.mkdirSync(path.dirname(targetAbs), { recursive: true });
    fs.writeFileSync(targetAbs, `${buildStandardCoverSvg(item)}\n`, 'utf8');
    item.imageUrl = targetRel;
    standardizedCount += 1;
  }
}


const fallbackRoot = path.join(root, 'assets/covers/fallback');
const referencedFallbacks = new Set(
  catalog
    .map((item) => item.imageUrl)
    .filter((imageUrl) => typeof imageUrl === 'string' && imageUrl.startsWith('assets/covers/fallback/'))
    .map((imageUrl) => path.resolve(root, imageUrl))
);
let removedUnusedFallbacks = 0;

function removeUnusedFallbacks(directory) {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      removeUnusedFallbacks(entryPath);
      if (fs.readdirSync(entryPath).length === 0) fs.rmdirSync(entryPath);
    } else if (entry.isFile() && /\\.svg$/i.test(entry.name) && !referencedFallbacks.has(path.resolve(entryPath))) {
      fs.unlinkSync(entryPath);
      removedUnusedFallbacks += 1;
    }
  }
}

removeUnusedFallbacks(fallbackRoot);

fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
console.log(`Capas oficiais mantidas: ${preservedOfficial} | Capas padronizadas: ${standardizedCount} | Fallbacks sem uso removidos: ${removedUnusedFallbacks}`);

