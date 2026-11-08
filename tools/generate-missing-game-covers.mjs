import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalogPath = path.join(root, 'catalog/catalog.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const missingNames = new Set([
  'God of War', 'Uncharted: The Lost Legacy', 'The Last of Us Part II', 'Ghost of Tsushima',
  "Marvel's Spider-Man", 'Days Gone', 'Bloodborne', 'Detroit: Become Human', 'Ratchet & Clank',
  'Until Dawn', 'The Witcher 3: Wild Hunt – Complete Edition', 'Cyberpunk 2077',
  'Grand Theft Auto V', 'Resident Evil 2', 'Resident Evil 4', 'Resident Evil 3',
  'Resident Evil 7: Biohazard', "Assassin's Creed Origins", "Assassin's Creed Odyssey",
  "Assassin's Creed Valhalla", 'Far Cry 5', 'Far Cry 6', 'Mortal Kombat 11', 'Injustice 2',
  'Street Fighter V', 'Tekken 7', 'Crash Bandicoot N. Sane Trilogy', 'Dragon Ball Z: Kakarot',
  "Crash Bandicoot 4: It's About Time", 'Spyro Reignited Trilogy', 'Sackboy: A Big Adventure',
  'It Takes Two', 'Overcooked! 2', 'A Way Out', 'The Sims 4', 'Minecraft', 'Hades',
  "No Man's Sky", 'Hollow Knight', 'Cuphead', 'Stardew Valley', 'Celeste'
]);
const xml = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const normalize = (value) => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
function artFor(item) {
  let seed = 0;
  for (const char of item.id + item.name) seed = (seed * 31 + char.charCodeAt(0)) >>> 0;
  const hue = seed % 360;
  const accent = (hue + 46 + seed % 64) % 360;
  const name = normalize(item.name);
  let scene;
  if (/resident evil|zombie|horror|until dawn|days gone/.test(name)) {
    scene = '<circle cx="290" cy="165" r="65" fill="#d7b8a7" opacity=".48"/><path d="M0 315 55 250l45 27 56-92 60 78 54-100 72 84 49-46 109 90v130H0Z" fill="#201520"/><path d="M0 389 84 311l75 48 70-68 66 78 73-89 67 62 77-38v115H0Z" fill="#090b12"/><path d="m86 383 14-44 15 44m164 0 17-62 19 62" fill="none" stroke="#c44e55" stroke-width="5"/>';
  } else if (/grand theft|mafia|crime|detroit|spider-man/.test(name)) {
    scene = '<circle cx="292" cy="154" r="67" fill="hsl(' + accent + ',75%,72%)" opacity=".43"/><path d="M0 293h45v-60h38v42h43v-98h49v116h39V171h52v122h35v-70h42v70h49v-51h42v51h78v157H0Z" fill="#151a27"/><path d="M0 404 168 331l78 34 106-82 160 91v91H0Z" fill="#090c14"/><path d="M215 464q30-78 92-121 53-37 96-45-38 51-40 92 0 39 49 74Z" fill="#252b36" stroke="hsl(' + accent + ',84%,70%)" stroke-width="4"/>';
  } else if (/assassin|creed|witcher|bloodborne|hades|ghost of tsushima|god of war|dark|fantasy/.test(name)) {
    scene = '<circle cx="292" cy="155" r="69" fill="hsl(' + accent + ',84%,74%)" opacity=".47"/><path d="M0 320 70 241l54 43 74-119 78 104 49-65 75 84 54-51 58 59v146H0Z" fill="#191622"/><path d="M0 387 90 309l66 49 72-72 77 83 67-79 80 68 60-48v113H0Z" fill="#090b13"/><path d="M198 245q17-67 79-69 60 2 78 69l-17 111H216z" fill="#070910"/><path d="m184 253 94-69 93 69-35-5-58-41-60 41z" fill="hsl(' + accent + ',80%,69%)"/>';
  } else if (/far cry|war|mortal kombat|injustice|street fighter|tekken|dragon ball|uncharted/.test(name)) {
    scene = '<circle cx="292" cy="157" r="69" fill="#d7a46e" opacity=".42"/><path d="M0 304 71 250l65 29 49-62 75 77 54-91 81 75 47-47 70 72v141H0Z" fill="#211e23"/><path d="M0 385 97 330l77 24 63-40 76 49 62-43 78 48 59-31v105H0Z" fill="#090b12"/><path d="M71 258h92m-64-14v28m36-28v28m170-51q39-26 81 0m-40-20v21m-30-10h60" fill="none" stroke="#d1b18a" stroke-width="5" opacity=".72"/>';
  } else if (/fifa|ea sports|football|soccer|nba|racing|gran turismo|f1 |formula|crash bandicoot|spyro|sackboy|overcooked|the sims|minecraft|stardew/.test(name)) {
    scene = '<circle cx="290" cy="157" r="68" fill="hsl(' + accent + ',84%,76%)" opacity=".42"/><path d="M0 280q128-132 256 0t256 0v185H0Z" fill="#151b27"/><path d="M0 312q128-132 256 0t256 0m-512 41q128-132 256 0t256 0" fill="none" stroke="#d8e9f5" stroke-opacity=".58" stroke-width="5"/><path d="M0 416q129-68 256 0t256 0v84H0Z" fill="#090d15"/><path d="M72 486 209 407l47 8 42-8 143 79" fill="none" stroke="hsl(' + accent + ',90%,72%)" stroke-opacity=".72" stroke-width="4"/>';
  } else if (/horizon|space|no man's sky|cyberpunk|ratchet|no man's|mass effect/.test(name)) {
    scene = '<circle cx="286" cy="152" r="76" fill="hsl(' + accent + ',90%,72%)" opacity=".48"/><circle cx="286" cy="152" r="49" fill="none" stroke="#eaf3ff" stroke-opacity=".6" stroke-width="3"/><path d="M0 300 65 248l62 34 58-90 62 78 59-70 69 80 58-47 79 72v148H0Z" fill="#141a27"/><path d="M0 378 92 302l71 52 76-71 70 76 74-57 70 63 59-40v123H0Z" fill="#080b13"/><path d="m170 238 43-34 42 34-42 16zm149 30 28-23 30 23-30 14z" fill="hsl(' + accent + ',92%,75%)" opacity=".84"/>';
  } else {
    scene = '<circle cx="288" cy="155" r="70" fill="hsl(' + accent + ',84%,74%)" opacity=".42"/><path d="M0 300 73 225l59 47 71-123 81 107 49-68 77 85 53-51 49 60v165H0Z" fill="#151623"/><path d="M0 381 91 305l67 49 79-69 68 83 70-79 70 68 67-46v116H0Z" fill="#080b13"/><path d="M194 324v-62q0-64 62-64t62 64v62m-104 0v-57q0-44 42-44t42 44v57" fill="none" stroke="hsl(' + accent + ',86%,73%)" stroke-width="7"/>';
  }
  const words = item.name.split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = (line + ' ' + word).trim();
    if (next.length > 19 && line) { lines.push(line); line = word; }
    else line = next;
  }
  if (line) lines.push(line);
  const fontSize = lines.some((value) => value.length > 17) ? 20 : 25;
  const title = lines.slice(0, 3).map((value, index) => '<text x="200" y="' + (400 + index * 30) + '" text-anchor="middle" fill="#f5f0e8" font-family="Arial,sans-serif" font-size="' + fontSize + '" font-weight="900">' + xml(value) + '</text>').join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 580"><defs><linearGradient id="bg" x2="0.8" y2="1"><stop stop-color="hsl(${hue},46%,25%)"/><stop offset=".58" stop-color="#101321"/><stop offset="1" stop-color="#080b13"/></linearGradient><radialGradient id="glow"><stop stop-color="hsl(${accent},96%,70%)" stop-opacity=".8"/><stop offset="1" stop-color="hsl(${accent},96%,42%)" stop-opacity="0"/></radialGradient></defs><rect width="400" height="580" fill="url(#bg)"/><ellipse cx="${165 + seed % 120}" cy="208" rx="238" ry="250" fill="url(#glow)"/>${scene}<path d="M0 360q104-42 200 0t200 0v220H0Z" fill="#070a12" fill-opacity=".8"/><rect x="18" y="18" width="364" height="42" rx="3" fill="#080b13" fill-opacity=".8" stroke="hsl(${accent},85%,74%)" stroke-opacity=".6"/><text x="200" y="46" text-anchor="middle" fill="#f4f0e8" font-family="Arial,sans-serif" font-size="14" font-weight="800" letter-spacing="3">HADES STORE  •  PS4</text><rect x="20" y="369" width="360" height="119" rx="5" fill="#080b13" fill-opacity=".72" stroke="hsl(${accent},85%,74%)" stroke-opacity=".66"/>${title}<text x="200" y="545" text-anchor="middle" fill="#d5d9e4" font-family="Arial,sans-serif" font-size="11" letter-spacing="2">ARTE ORIGINAL DE CATÁLOGO</text></svg>`;
}

const generated = [];
for (const item of catalog) {
  if (!missingNames.has(item.name)) continue;
  const filename = `assets/covers/fallback/${item.id}.svg`;
  const target = path.join(root, filename);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${artFor(item)}\n`, 'utf8');
  item.imageUrl = filename;
  generated.push(item.name);
}
const missing = [...missingNames].filter((name) => !generated.includes(name));
if (missing.length) throw new Error(`Catalog entries not found: ${missing.join(', ')}`);
fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
console.log(`Generated ${generated.length} offline HADES game covers.`);
