const state = {
  catalog: [],
  category: 'Todos',
  sort: 'featured',
  favorites: new Set(),
  activeItem: null,
  featuredItem: null
};

const $ = (selector) => document.querySelector(selector);
const grid = $('#grid');
const search = $('#search');
const empty = $('#empty');
const dialog = $('#details');
const status = $('#catalog-status');
const backdropLayers = [...document.querySelectorAll('.catalog-backdrop-layer')];
const storeIntro = document.querySelector('.store-intro');
const storeBanner = document.querySelector('.store-banner');
if (storeIntro && storeBanner && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  storeIntro.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') return;
    const bounds = storeIntro.getBoundingClientRect();
    const horizontal = (event.clientX - bounds.left) / bounds.width - 0.5;
    const vertical = (event.clientY - bounds.top) / bounds.height - 0.5;
    storeBanner.style.setProperty('--banner-x', `${(-horizontal * 9).toFixed(1)}px`);
    storeBanner.style.setProperty('--banner-y', `${(-vertical * 5).toFixed(1)}px`);
  });
  storeIntro.addEventListener('pointerleave', () => {
    storeBanner.style.setProperty('--banner-x', '0px');
    storeBanner.style.setProperty('--banner-y', '0px');
  });
}
const FAVORITES_KEY = 'hades-store:favorites:v1';
let visibleBackdropIndex = 0;
let displayedBackdropId = '';
let pendingBackdropId = '';
let backdropUpdateTimer = 0;
const gamepadShoulders = new Map();
let gamepadPolling = false;
const SOUND_PREFERENCE_KEY = 'hades-store:ui-sounds:v1';
let audioEnabled = false;
let uiAudioContext = null;
let requestedCarouselPage = null;
let carouselTargetTimer = 0;
let searchRenderTimer = 0;
try {
  audioEnabled = localStorage.getItem(SOUND_PREFERENCE_KEY) === 'true';
} catch (error) {
  audioEnabled = false;
}

function safe(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

function normalize(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
}

function loadFavorites() {
  try {
    const stored = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
    if (Array.isArray(stored)) state.favorites = new Set(stored.filter((id) => typeof id === 'string'));
  } catch (error) {
    state.favorites = new Set();
  }
}

function saveFavorites() {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...state.favorites]));
  } catch (error) {
    setStatus('FAVORITOS DISPONÍVEIS APENAS NESTA SESSÃO', 'warning');
  }
}

function setStatus(message, kind = 'online') {
  if (!status) return;
  status.className = 'status ' + kind;
  status.innerHTML = '<i></i> ' + safe(message);
}

function setFeaturedItem(item) {
  const category = $('#featured-category');
  const title = $('#featured-title');
  const description = $('#featured-description');
  const open = $('#featured-open');
  if (!category || !title || !description || !open) return;

  if (!item) {
    state.featuredItem = null;
    category.textContent = '';
    title.textContent = 'Nenhum item encontrado';
    description.textContent = 'Altere a busca ou a categoria para continuar explorando.';
    open.disabled = true;
    return;
  }

  state.featuredItem = item;
  category.textContent = String(item.category || 'CATÁLOGO').toLocaleUpperCase('pt-BR')
    + (item.version ? ' · ' + item.version : '');
  title.textContent = item.name || 'Item do catálogo';
  description.textContent = item.description || 'Confira os detalhes e as opções disponíveis para este item.';
  open.disabled = false;
}

function updateSoundToggle() {
  const button = $('#sound-toggle');
  const label = $('#sound-label');
  if (!button || !label) return;
  button.setAttribute('aria-pressed', String(audioEnabled));
  button.setAttribute('aria-label', audioEnabled ? 'Desativar sons da interface' : 'Ativar sons da interface');
  button.classList.toggle('is-enabled', audioEnabled);
  label.textContent = audioEnabled ? 'SOM ON' : 'SOM OFF';
}

function playUiSound(kind = 'move') {
  if (!audioEnabled) return;
  const AudioContextType = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextType) return;

  try {
    if (!uiAudioContext || uiAudioContext.state === 'closed') uiAudioContext = new AudioContextType();
    const context = uiAudioContext;
    const playTone = () => {
      if (!audioEnabled) return;
      const frequency = { move: 560, confirm: 760, back: 430 }[kind] || 560;
      const oscillator = context.createOscillator();
      const volume = context.createGain();
      const start = context.currentTime;
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, start);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.78, start + 0.11);
      volume.gain.setValueAtTime(0.0001, start);
      volume.gain.exponentialRampToValueAtTime(0.035, start + 0.012);
      volume.gain.exponentialRampToValueAtTime(0.0001, start + 0.13);
      oscillator.connect(volume);
      volume.connect(context.destination);
      oscillator.onended = () => {
        oscillator.disconnect();
        volume.disconnect();
        oscillator.onended = null;
      };
      oscillator.start(start);
      oscillator.stop(start + 0.14);
    };
    if (context.state === 'suspended') context.resume().then(playTone).catch(() => {});
    else playTone();
  } catch (error) {
    // Optional audio must not interrupt catalog navigation.
  }
}

updateSoundToggle();

function filteredItems() {
  const query = normalize(search.value);
  const items = state.catalog.filter((item) => {
    const matchesCategory = state.category === 'Todos'
      || (state.category === 'Favoritos' ? state.favorites.has(item.id) : item.category === state.category);
    const haystack = normalize([item.name, item.description, item.language, item.version, item.category].join(' '));
    return matchesCategory && (!query || haystack.includes(query));
  });

  if (state.sort === 'name-asc') items.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  if (state.sort === 'name-desc') items.sort((a, b) => b.name.localeCompare(a.name, 'pt-BR'));
  if (state.sort === 'category') items.sort((a, b) => a.category.localeCompare(b.category, 'pt-BR') || a.name.localeCompare(b.name, 'pt-BR'));
  return items;
}

function favoriteButton(item, compact = false) {
  const active = state.favorites.has(item.id);
  return '<button class="favorite-toggle' + (compact ? ' compact' : '') + '" type="button" data-favorite="' + safe(item.id)
    + '" aria-label="' + (active ? 'Remover ' : 'Adicionar ') + safe(item.name) + ' ' + (active ? 'dos' : 'aos')
    + ' favoritos" aria-pressed="' + String(active) + '">' + (active ? '★' : '☆') + '</button>';
}

function uniquePackageLinks(item) {
  const rawPackageLinks = Array.isArray(item.packageLinks)
    ? item.packageLinks.filter((entry) => entry && typeof entry.label === 'string' && /^https:\/\//i.test(entry.url || ''))
    : [];
  const seenUrls = new Set();
  return rawPackageLinks.filter((entry) => {
    if (seenUrls.has(entry.url)) return false;
    seenUrls.add(entry.url);
    return true;
  });
}

function generatedCover(item) {
  const seedText = String(item.id || item.name || 'PS4');
  let seed = 0;
  for (const char of seedText) seed = (seed * 31 + char.charCodeAt(0)) >>> 0;
  const hue = seed % 360;
  const hue2 = (hue + 48 + (seed % 80)) % 360;
  const titleLines = [];
  let line = '';
  for (const word of String(item.name || 'PLAYSTATION 4').split(/\s+/)) {
    if ((line + ' ' + word).trim().length > 22 && line) {
      titleLines.push(line);
      line = word;
    } else line = (line + ' ' + word).trim();
  }
  if (line) titleLines.push(line);
  const titleSvg = titleLines.slice(0, 4).map((value, index) =>
    '<text x="256" y="' + (603 + index * 33) + '" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif" font-size="27" font-weight="900" letter-spacing="1">' + value.replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char]) + '</text>'
  ).join('');
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 768"><defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="hsl(' + hue + ',58%,26%)"/><stop offset=".56" stop-color="#071327"/><stop offset="1" stop-color="hsl(' + hue2 + ',78%,22%)"/></linearGradient><radialGradient id="light"><stop stop-color="hsl(' + hue2 + ',100%,72%)" stop-opacity=".9"/><stop offset="1" stop-color="hsl(' + hue2 + ',100%,45%)" stop-opacity="0"/></radialGradient><pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><path d="M0 0V32" stroke="#c7eaff" stroke-opacity=".08" stroke-width="2"/></pattern></defs><rect width="512" height="768" fill="url(#bg)"/><rect width="512" height="768" fill="url(#grid)"/><ellipse cx="' + (185 + seed % 150) + '" cy="300" rx="270" ry="310" fill="url(#light)" opacity=".68"/><path d="M0 478L119 286l91 122 95-202 207 310v252H0Z" fill="#020817" fill-opacity=".72"/><path d="M30 504L153 338l81 109 90-143 165 211" fill="none" stroke="hsl(' + hue2 + ',94%,72%)" stroke-opacity=".78" stroke-width="5"/><circle cx="' + (170 + seed % 172) + '" cy="250" r="' + (70 + seed % 44) + '" fill="hsl(' + hue + ',88%,72%)" fill-opacity=".13"/><path d="M0 549Q128 474 251 547T512 526V768H0Z" fill="#020817" fill-opacity=".86"/><rect x="22" y="565" width="468" height="170" rx="8" fill="#020817" fill-opacity=".54" stroke="#d8efff" stroke-opacity=".32"/><text x="42" y="592" fill="hsl(' + hue2 + ',100%,78%)" font-family="Arial,sans-serif" font-size="15" font-weight="700" letter-spacing="3">HADES STORE  •  PS4</text>' + titleSvg + '<path d="M34 62h120M34 78h76" stroke="#fff" stroke-opacity=".7" stroke-width="4"/><circle cx="458" cy="65" r="18" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="3"/></svg>';
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
}

function themedFallbackCover(item) {
  const key = normalize(item.name);
  let seed = 0;
  for (const char of String(item.id || item.name || 'PS4')) seed = (seed * 31 + char.charCodeAt(0)) >>> 0;
  const hue = seed % 360;
  const accent = (hue + 52 + seed % 54) % 360;
  let scene;
  if (/resident evil|zombie|horror|outlast|dead island|plague tale/.test(key)) {
    scene = '<circle cx="293" cy="175" r="75" fill="#d7b9aa" opacity=".45"/><path d="M0 365 55 302l46 29 57-94 59 84 58-116 74 94 52-53 99 94v178H0Z" fill="#19131c"/><path d="M0 438 89 355l76 50 70-74 64 81 72-95 67 68 74-42v160H0Z" fill="#090b12"/><path d="m100 432 14-48 15 48m157 5 18-65 19 65" fill="none" stroke="#bd5153" stroke-width="5" opacity=".78"/>';
  } else if (/grand theft|mafia|crime|detroit|noire|judgment|yakuza/.test(key)) {
    scene = '<circle cx="291" cy="172" r="74" fill="hsl(' + accent + ',75%,74%)" opacity=".4"/><path d="M0 350h45v-65h38v47h42V236h49v114h39V211h52v139h35v-79h42v79h53v-55h42v55h75v180H0Z" fill="#11151f"/><path d="M0 478 172 401l77 34 104-87 159 93v129H0Z" fill="#090c14"/><path d="M231 590q32-83 94-128 53-39 98-48-39 53-40 95 0 40 49 81Z" fill="#202630" stroke="hsl(' + accent + ',88%,72%)" stroke-opacity=".65" stroke-width="4"/>';
  } else if (/assassin|creed|witcher|bloodborne|souls|nioh|hades|dragon|kingdom/.test(key)) {
    scene = '<circle cx="294" cy="176" r="82" fill="hsl(' + accent + ',82%,74%)" opacity=".44"/><path d="M0 376 70 294l54 43 73-131 79 112 49-71 74 91 54-55 59 77v176H0Z" fill="#171521"/><path d="M0 454 88 373l69 52 69-73 79 91 65-84 79 78 63-50v154H0Z" fill="#090b13"/><path d="M201 285q17-72 78-74 58 2 74 74l-17 114H218z" fill="#070910"/><path d="m186 293 93-73 92 73-33-5-59-43-60 43z" fill="hsl(' + accent + ',80%,68%)"/><path d="M216 390 278 319l66 72v84H216z" fill="#080a11"/>';
  } else if (/call of duty|battlefield|war|far cry|division|rage|payday/.test(key)) {
    scene = '<circle cx="291" cy="179" r="80" fill="#d9a875" opacity=".4"/><path d="M0 366 71 315l64 30 49-64 73 80 55-96 81 79 48-48 71 77v156H0Z" fill="#201d20"/><path d="M0 452 96 395l77 27 62-42 75 53 61-45 74 49 67-30v144H0Z" fill="#090b12"/><path d="M74 326h90m-63-15v30m36-29v28m173-52q39-27 80 0m-40-20v22m-31-11h63" fill="none" stroke="#c6aa81" stroke-width="5" opacity=".7"/>';
  } else if (/fifa|ea sports|football|soccer|nba|gran turismo|f1 |formula|racing|project cars/.test(key)) {
    scene = '<circle cx="292" cy="173" r="79" fill="hsl(' + accent + ',84%,75%)" opacity=".42"/><path d="M0 337q132-134 256 0t256 0v226H0Z" fill="#151a28"/><path d="M0 372q132-134 256 0t256 0m-512 42q132-134 256 0t256 0" fill="none" stroke="#d8e9f5" stroke-opacity=".52" stroke-width="5"/><path d="M0 500q128-70 256 0t256 0v100H0Z" fill="#090d15"/><path d="M72 599 210 506l44 8 42-8 145 93" fill="none" stroke="hsl(' + accent + ',90%,72%)" stroke-opacity=".66" stroke-width="4"/>';
  } else if (/horizon|space|mass effect|ghostrunner|bioshock|control|no man's sky/.test(key)) {
    scene = '<circle cx="288" cy="169" r="91" fill="hsl(' + accent + ',90%,72%)" opacity=".46"/><circle cx="288" cy="169" r="62" fill="none" stroke="#eaf3ff" stroke-opacity=".58" stroke-width="3"/><path d="M0 368 64 314l61 35 59-97 61 82 58-72 68 83 59-49 82 75v184H0Z" fill="#131722"/><path d="M0 444 91 370l72 54 76-77 69 81 75-59 70 66 59-41v135H0Z" fill="#080b13"/><path d="m175 302 43-35 42 35-42 17zm149 29 28-24 30 24-30 15z" fill="hsl(' + accent + ',91%,75%)" opacity=".82"/>';
  } else {
    scene = '<circle cx="288" cy="174" r="84" fill="hsl(' + accent + ',84%,74%)" opacity=".4"/><path d="M0 374 73 291l59 48 71-136 80 120 49-72 77 92 52-54 51 62v177H0Z" fill="#151522"/><path d="M0 454 91 374l67 51 79-73 68 88 70-83 70 72 67-49v148H0Z" fill="#080b13"/><path d="M194 391V311q0-72 62-72t62 72v80m-105 0v-75q0-49 43-49t43 49v75" fill="none" stroke="hsl(' + accent + ',86%,73%)" stroke-width="7"/><path d="M0 541q91-42 180 0t160 0q84-42 172 0v67H0Z" fill="#070a12"/>';
  }
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 768"><defs><linearGradient id="bg" x2=".9" y2="1"><stop stop-color="hsl(' + hue + ',44%,23%)"/><stop offset=".56" stop-color="#101321"/><stop offset="1" stop-color="#080b13"/></linearGradient><radialGradient id="glow"><stop stop-color="hsl(' + accent + ',95%,68%)" stop-opacity=".8"/><stop offset="1" stop-color="hsl(' + accent + ',95%,42%)" stop-opacity="0"/></radialGradient><linearGradient id="fade" x2="0" y2="1"><stop stop-color="#070a12" stop-opacity="0"/><stop offset="1" stop-color="#070a12" stop-opacity=".92"/></linearGradient></defs><rect width="512" height="768" fill="url(#bg)"/><ellipse cx="' + (175 + seed % 170) + '" cy="260" rx="270" ry="295" fill="url(#glow)" opacity=".68"/>' + scene + '<rect y="390" width="512" height="378" fill="url(#fade)"/><path d="M0 662q120-34 256 0t256 0v106H0Z" fill="#070a12" fill-opacity=".72"/><path d="M30 706h452" stroke="hsl(' + accent + ',90%,74%)" stroke-opacity=".55" stroke-width="2"/><text x="34" y="744" fill="#e7edf6" font-family="Arial,sans-serif" font-size="14" font-weight="700" letter-spacing="3">HADES STORE  •  ARTE ORIGINAL</text><path d="M30 48h110m-110 16h67" stroke="#edf4ff" stroke-opacity=".55" stroke-width="4"/><circle cx="466" cy="55" r="15" fill="none" stroke="hsl(' + accent + ',90%,76%)" stroke-width="3"/></svg>';
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
}

function versionedArtworkUrl(url) {
  if (!url || /^(?:data:|https?:|blob:)/i.test(url)) return url;
  const [resource, fragment] = url.split('#', 2);
  const versioned = resource + (resource.includes('?') ? '&' : '?') + 'v=hades-artwork-v6';
  return fragment ? versioned + '#' + fragment : versioned;
}

function coverSource(item) {
  if (item.category === 'Jogos' && (!item.imageUrl || item.imageUrl.endsWith('game-cover.svg'))) return themedFallbackCover(item);
  if (item.category === 'Emuladores' && !item.imageUrl) return themedFallbackCover(item);
  return versionedArtworkUrl(item.imageUrl || '');
}

function installArtworkFallback(image, item, onExhausted) {
  let fallbackStage = 0;
  const generatedArtwork = themedFallbackCover(item);
  const localArtwork = item.category === 'Jogos' && /^ps4-extra-\d{3}$/.test(item.id)
    ? 'assets/covers/' + item.id + '.svg'
    : '';

  image.addEventListener('error', () => {
    const currentSource = image.getAttribute('src') || '';
    if (fallbackStage === 0 && localArtwork && currentSource !== localArtwork) {
      fallbackStage = 1;
      image.src = localArtwork;
      return;
    }
    if (fallbackStage < 2 && currentSource !== generatedArtwork) {
      fallbackStage = 2;
      image.src = generatedArtwork;
      return;
    }
    onExhausted();
  });
}

function createCard(item) {
  const card = document.createElement('article');
  card.className = 'app-card';
  card.dataset.itemId = item.id;
  card.tabIndex = 0;
  card.setAttribute('role', 'group');
  card.setAttribute('aria-label', 'Ver detalhes de ' + item.name);
  const seed = Number.parseInt(item.icon, 10);
  card.dataset.cover = String(Number.isFinite(seed) ? (seed - 1 + 8) % 8 : state.catalog.indexOf(item) % 8);

  let visual = '<div class="app-icon">' + safe(item.icon || 'H') + '</div>';
  if (item.category === 'Jogos') {
    visual = '<div class="game-physical" aria-hidden="true"><div class="game-cover"><div class="ps4-band"></div><img class="game-cover-art" src="' + safe(coverSource(item)) + '" alt="" loading="lazy" decoding="async"><span class="cover-fallback">' + safe(item.name) + '</span></div></div>';
  } else if (item.category === 'Emuladores') {
    visual = '<div class="game-physical emulator-physical" aria-hidden="true"><div class="game-cover"><div class="ps4-band"></div><img class="game-cover-art" src="' + safe(versionedArtworkUrl(item.imageUrl || themedFallbackCover(item))) + '" alt="" loading="lazy" decoding="async"><span class="cover-fallback">' + safe(item.name) + '</span></div></div>';
  } else if (item.category === 'Aplicativos' || item.category === 'Homebrews') {
    visual = '<div class="software-art"><img src="' + safe(versionedArtworkUrl(item.imageUrl || themedFallbackCover(item))) + '" alt="" loading="lazy" decoding="async"></div>';
  } else if (item.imageUrl) {
    visual = '<div class="software-art"><img src="' + safe(versionedArtworkUrl(item.imageUrl)) + '" alt="" loading="lazy" decoding="async"></div>';
  }

  card.innerHTML = favoriteButton(item, true) + visual
    + '<h3>' + safe(item.name) + '</h3>';

  const open = (event) => {
    if (event && event.target.closest('[data-favorite]')) return;
    // Abrir primeiro os detalhes: assim o usuário vê JOGO, UPDATE e DLC
    // antes de escolher qual link externo deseja acessar.
    showDetails(item);
  };
  card.addEventListener('click', open);
  card.addEventListener('pointerenter', () => setFeaturedItem(item));
  card.addEventListener('focus', () => setFeaturedItem(item));
  card.addEventListener('keydown', (event) => {
    if (event.target.closest('[data-favorite]')) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      open(event);
    }
  });

  const coverImage = card.querySelector('.game-cover-art');
  const gameCover = card.querySelector('.game-cover');
  if (coverImage && gameCover) {
    const fitCover = () => {
      const source = coverImage.getAttribute('src') || '';
      const isGenerated = source.startsWith('data:image/svg+xml');
      const isLandscape = coverImage.naturalWidth / Math.max(1, coverImage.naturalHeight) > 1.05;
      const hasWhiteMatte = /(?:^|\/)ps4-(?:02|19)-hq\.jpg(?:[?#]|$)/i.test(source);
      gameCover.classList.toggle('has-ps4-band', isGenerated || isLandscape);
      gameCover.classList.toggle('padded-cover-art', hasWhiteMatte);
      gameCover.style.setProperty('--cover-art-src', 'url(' + JSON.stringify(coverImage.currentSrc || coverImage.src) + ')');
    };
    coverImage.addEventListener('load', fitCover);
    if (coverImage.complete && coverImage.naturalWidth) fitCover();
    installArtworkFallback(coverImage, item, () => {
      coverImage.remove();
      gameCover.classList.add('has-ps4-band');
      gameCover.classList.add('cover-image-missing');
    });
  }
  const softwareImage = card.querySelector('.software-art img');
  if (softwareImage) {
    const softwareArt = card.querySelector('.software-art');
    softwareArt.dataset.fallbackName = item.name;
    installArtworkFallback(softwareImage, item, () => {
      softwareImage.remove();
      softwareArt.classList.add('art-image-missing');
    });
  }
  return card;
}

function render() {
  const items = filteredItems();
  clearCarouselTarget();
  grid.replaceChildren(...items.map(createCard));
  grid.scrollLeft = 0;
  setFeaturedItem(items[0]);
  empty.hidden = items.length > 0;
  const totalGames = state.catalog.filter((item) => item.category === 'Jogos').length;
  $('#results-count').textContent = items.length + (items.length === 1 ? ' item encontrado' : ' itens encontrados')
    + ' · ' + totalGames + ' jogos no catálogo';
  updateCarouselControls();
  scheduleCatalogBackdropUpdate();
  document.querySelectorAll('[data-category]').forEach((button) => {
    const active = button.dataset.category === state.category;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function scheduleCatalogBackdropUpdate() {
  if (backdropLayers.length < 2) return;
  window.clearTimeout(backdropUpdateTimer);
  backdropUpdateTimer = window.setTimeout(updateCatalogBackdrop, 100);
}

function updateCatalogBackdrop() {
  const viewport = grid.getBoundingClientRect();
  const center = viewport.left + viewport.width / 2;
  let selectedCard = null;
  let selectedDistance = Infinity;

  for (const card of grid.querySelectorAll('.app-card')) {
    const bounds = card.getBoundingClientRect();
    if (bounds.right <= viewport.left || bounds.left >= viewport.right) continue;
    const distance = Math.abs((bounds.left + bounds.right) / 2 - center);
    if (distance < selectedDistance) {
      selectedCard = card;
      selectedDistance = distance;
    }
  }

  if (!selectedCard) return;
  const itemId = selectedCard.dataset.itemId;
  if (!itemId || itemId === displayedBackdropId || itemId === pendingBackdropId) return;
  const artwork = selectedCard.querySelector('.game-cover-art, .software-art img');
  const imageUrl = artwork?.currentSrc || artwork?.src;
  if (!imageUrl) return;

  pendingBackdropId = itemId;
  const nextIndex = 1 - visibleBackdropIndex;
  const nextLayer = backdropLayers[nextIndex];
  nextLayer.style.backgroundImage = 'linear-gradient(180deg,rgba(4,8,20,.54),rgba(5,9,22,.72) 48%,rgba(5,8,17,.84)),url(' + JSON.stringify(imageUrl) + ')';
  nextLayer.dataset.itemId = itemId;
  window.requestAnimationFrame(() => {
    if (pendingBackdropId !== itemId) return;
    nextLayer.classList.add('is-visible');
    backdropLayers[visibleBackdropIndex].classList.remove('is-visible');
    visibleBackdropIndex = nextIndex;
    displayedBackdropId = itemId;
    pendingBackdropId = '';
  });
}

function updateCarouselControls() {
  const pageCount = $('#page-count');
  const previous = $('#carousel-previous');
  const next = $('#carousel-next');
  if (!pageCount || !previous || !next) return;
  const metrics = carouselMetrics();
  const pages = metrics.pages;
  const currentPageIndex = requestedCarouselPage ?? currentCarouselPageIndex(metrics);
  const currentPage = pages ? currentPageIndex + 1 : 0;
  pageCount.textContent = currentPage + ' / ' + pages;
  previous.disabled = currentPage <= 1;
  next.disabled = currentPage === 0 || currentPage >= pages;
}

function carouselMetrics() {
  const cards = [...grid.querySelectorAll('.app-card')];
  if (!cards.length) {
    grid.style.setProperty('--carousel-trailing-space', '0px');
    return { cards, perPage: 1, pages: 0, pageStep: Math.max(1, grid.clientWidth) };
  }

  const styles = window.getComputedStyle(grid);
  const gap = Number.parseFloat(styles.columnGap) || 0;
  const paddingLeft = Number.parseFloat(styles.paddingLeft) || 0;
  const paddingRight = Number.parseFloat(styles.paddingRight) || 0;
  const usableWidth = Math.max(1, grid.clientWidth - paddingLeft - paddingRight);
  const cardWidth = cards[0].getBoundingClientRect().width;
  const step = Math.max(1, cardWidth + gap);
  const perPage = Math.max(1, Math.floor((usableWidth + gap + 0.5) / step));
  const pages = Math.ceil(cards.length / perPage);
  const lastPageCount = cards.length - (pages - 1) * perPage;
  const trailingSpace = Math.max(0, usableWidth - lastPageCount * step);
  grid.style.setProperty('--carousel-trailing-space', trailingSpace + 'px');
  return { cards, perPage, pages, pageStep: step * perPage };
}

function carouselPageOffset(pageIndex, metrics) {
  const firstCard = metrics.cards[pageIndex * metrics.perPage];
  if (!firstCard) return 0;
  const gridBounds = grid.getBoundingClientRect();
  const paddingLeft = Number.parseFloat(window.getComputedStyle(grid).paddingLeft) || 0;
  const offset = grid.scrollLeft + firstCard.getBoundingClientRect().left - gridBounds.left - paddingLeft;
  const maxScroll = Math.max(0, grid.scrollWidth - grid.clientWidth);
  return Math.min(maxScroll, Math.max(0, offset));
}

function currentCarouselPageIndex(metrics) {
  if (!metrics.pages) return 0;
  return Math.min(metrics.pages - 1, Math.max(0, Math.round(grid.scrollLeft / metrics.pageStep)));
}

function clearCarouselTarget() {
  requestedCarouselPage = null;
  window.clearTimeout(carouselTargetTimer);
}

function scheduleCarouselTargetReset() {
  if (requestedCarouselPage === null) return;
  window.clearTimeout(carouselTargetTimer);
  carouselTargetTimer = window.setTimeout(() => {
    clearCarouselTarget();
    updateCarouselControls();
  }, 140);
}

function goToCarouselPage(direction) {
  const metrics = carouselMetrics();
  const { pages } = metrics;
  if (!pages) return;
  const currentPage = requestedCarouselPage ?? currentCarouselPageIndex(metrics);
  const targetPage = Math.min(pages - 1, Math.max(0, currentPage + direction));
  if (targetPage === currentPage) return;
  requestedCarouselPage = targetPage;
  window.clearTimeout(carouselTargetTimer);
  grid.scrollTo({ left: carouselPageOffset(targetPage, metrics), behavior: 'smooth' });
  updateCarouselControls();
  playUiSound('move');
}

function toggleFavorite(id) {
  const previousScroll = grid.scrollLeft;
  if (state.favorites.has(id)) state.favorites.delete(id);
  else state.favorites.add(id);
  saveFavorites();
  render();
  grid.scrollLeft = previousScroll;
  if (state.activeItem && state.activeItem.id === id) updateDetailFavorite(state.activeItem);
}

function updateDetailFavorite(item) {
  const active = state.favorites.has(item.id);
  const button = $('#detail-favorite');
  button.textContent = active ? '★ Remover dos favoritos' : '☆ Salvar favorito';
  button.setAttribute('aria-pressed', String(active));
}

function languageBadges(item, className = 'detail-language-badges') {
  const language = String(item.language || '');
  const subtitleLanguage = String(item.subtitleLanguage || item.subtitles || '');
  const audioLanguage = String(item.audio || '');
  const ptBr = /portugu[eê]s do brasil|pt[- .]?br/i;
  const badges = [];
  const audioIsPtBr = ptBr.test(audioLanguage) || (ptBr.test(language) && /dublad/i.test(language));
  const audioIsDubbed = /dublad/i.test(audioLanguage + ' ' + language);
  if (audioIsPtBr) {
    badges.push('<span class="language-badge audio-badge">' + (audioIsDubbed ? 'ÁUDIO DUBLADO · PT-BR' : 'ÁUDIO · PT-BR') + '</span>');
  }
  const subtitlesArePtBr = ptBr.test(subtitleLanguage) && /legend|subt[ií]t|traduz/i.test(subtitleLanguage)
    || ptBr.test(language) && /legend|subt[ií]t|traduz/i.test(language);
  if (subtitlesArePtBr) {
    badges.push('<span class="language-badge subtitle-badge">LEGENDAS · PT-BR</span>');
  }
  return badges.length ? '<div class="' + className + '" aria-label="Idiomas disponíveis">' + badges.join('') + '</div>' : '';
}

function showDetails(item) {
  playUiSound('confirm');
  state.activeItem = item;
  const image = $('#detail-image');
  const originalDetailImage = coverSource(item);
  const detailImageUrl = originalDetailImage || themedFallbackCover(item);
  image.hidden = !detailImageUrl;
  image.alt = detailImageUrl ? 'Imagem de ' + item.name : '';
  if (detailImageUrl) {
    image.dataset.fallbackAttempted = originalDetailImage ? '' : item.id;
    image.src = detailImageUrl;
    image.onerror = () => {
      if (image.dataset.fallbackAttempted !== item.id) {
        image.dataset.fallbackAttempted = item.id;
        image.src = themedFallbackCover(item);
        return;
      }
      image.hidden = true;
    };
  } else {
    image.removeAttribute('src');
  }

  $('#detail-category').textContent = String(item.category || '').toUpperCase();
  $('#detail-title').textContent = item.name;
  $('#detail-description').textContent = item.description || 'Sem descrição cadastrada.';
  const detailMeta = $('#detail-meta');
  detailMeta.replaceChildren();
  const facts = [
    ['VERSÃO', item.version || '—'],
    ['TAMANHO', item.size || 'Tamanho não informado'],
    ...(item.format ? [['FORMATO', item.format]] : [])
  ];
  for (const [label, value] of facts) {
    const fact = document.createElement('span');
    fact.className = 'detail-fact';
    const factLabel = document.createElement('strong');
    factLabel.textContent = label;
    const factValue = document.createElement('span');
    factValue.textContent = value;
    fact.append(factLabel, factValue);
    detailMeta.append(fact);
  }
  const badges = document.createElement('div');
  badges.innerHTML = languageBadges(item);
  if (badges.firstElementChild) detailMeta.append(badges.firstElementChild);

  const packageLinks = uniquePackageLinks(item);
  $('#detail-actions').hidden = false;
  const packageLinksSection = $('#package-links');
  packageLinksSection.replaceChildren();
  packageLinksSection.hidden = packageLinks.length === 0;
  if (packageLinks.length) {
    const heading = document.createElement('h3');
    heading.className = 'package-links-heading';
    heading.textContent = 'ARQUIVOS DISPONÍVEIS — ESCOLHA O QUE DESEJA ABRIR';
    packageLinksSection.append(heading);
  }
  const passwordNote = $('#download-password');
  if (passwordNote) passwordNote.hidden = packageLinks.length === 0;
  for (const entry of packageLinks) {
    const anchor = document.createElement('a');
    anchor.className = 'primary-btn download';
    anchor.href = entry.url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.textContent = entry.label + ' ↗';
    packageLinksSection.append(anchor);
  }
  const link = $('#detail-download');
  if (item.downloadUrl && /^https:\/\//i.test(item.downloadUrl) && packageLinks.length === 0) {
    link.href = item.downloadUrl;
    link.textContent = item.linkLabel || (item.category === 'Jogos' ? 'VER NA PLAYSTATION STORE ↗' : 'ABRIR LINK CADASTRADO ↗');
    link.hidden = false;
  } else {
    link.removeAttribute('href');
    link.hidden = true;
  }

  const gamesSection = $('#emulator-games');
  const gamesList = $('#emulator-games-list');
  gamesList.replaceChildren();
  const recommendedGames = Array.isArray(item.recommendedGames) ? item.recommendedGames : [];
  gamesSection.hidden = recommendedGames.length === 0;
  for (const game of recommendedGames) {
    const row = document.createElement('li');
    const title = document.createElement('strong');
    title.textContent = game.name;
    const details = document.createElement('span');
    details.textContent = [game.platform, game.genre].filter(Boolean).join(' · ');
    row.append(title, details);
    gamesList.append(row);
  }
  $('.dialog-note').textContent = item.downloadStatus === 'pending'
    ? 'Download temporariamente indisponível. O pacote já foi gerado; o link público será ativado após a configuração do armazenamento permanente da HADES Store.'
    : packageLinks.length
      ? 'Os links abrem a página do serviço de hospedagem. A senha informada para os arquivos compactados é 866919; o provedor pode exigir uma confirmação antes de iniciar o download.'
      : item.linkLabel
        ? 'Link externo cadastrado. Confira o destino, a procedência e a compatibilidade do arquivo antes de instalar.'
        : 'Confira edição, idioma, região e compatibilidade na página oficial antes de adquirir.';
  updateDetailFavorite(item);
  if (!dialog.open) dialog.showModal();
}

document.querySelectorAll('[data-category]').forEach((button) => {
  button.addEventListener('click', () => {
    playUiSound('move');
    state.category = button.dataset.category;
    render();
  });
});
$('#sound-toggle').addEventListener('click', () => {
  audioEnabled = !audioEnabled;
  try {
    localStorage.setItem(SOUND_PREFERENCE_KEY, String(audioEnabled));
  } catch (error) {
    // Keep the preference for the current session when storage is unavailable.
  }
  updateSoundToggle();
  if (audioEnabled) playUiSound('confirm');
  else if (uiAudioContext) {
    const context = uiAudioContext;
    uiAudioContext = null;
    context.close().catch(() => {});
  }
});
$('#search-shortcut').addEventListener('click', () => $('#search').focus());
$('#featured-open').addEventListener('click', () => {
  if (state.featuredItem) showDetails(state.featuredItem);
});
search.addEventListener('input', () => {
  window.clearTimeout(searchRenderTimer);
  searchRenderTimer = window.setTimeout(render, 120);
});
$('#sort').addEventListener('change', (event) => {
  state.sort = event.target.value;
  render();
});
grid.addEventListener('click', (event) => {
  const button = event.target.closest('[data-favorite]');
  if (button) {
    event.stopPropagation();
    toggleFavorite(button.dataset.favorite);
  }
});
$('#carousel-previous').addEventListener('click', () => goToCarouselPage(-1));
$('#carousel-next').addEventListener('click', () => goToCarouselPage(1));
grid.addEventListener('scroll', updateCarouselControls, { passive: true });
grid.addEventListener('scroll', scheduleCarouselTargetReset, { passive: true });
grid.addEventListener('scrollend', () => {
  clearCarouselTarget();
  updateCarouselControls();
});
grid.addEventListener('pointerdown', clearCarouselTarget);
grid.addEventListener('scroll', scheduleCatalogBackdropUpdate, { passive: true });
grid.addEventListener('focusin', scheduleCatalogBackdropUpdate);
window.addEventListener('resize', () => {
  clearCarouselTarget();
  updateCarouselControls();
});

/* HADES-GAMEPAD-FULL */
function pollGamepadShoulders() {
  gamepadPolling = false;
  if (!navigator.getGamepads) return;
  let connected = false;
  for (const gamepad of navigator.getGamepads()) {
    if (!gamepad) continue;
    connected = true;
    const previous = gamepadShoulders.get(gamepad.index) || {};
    const axes = gamepad.axes || [];
    const pressed = (index) => Boolean(gamepad.buttons[index]?.pressed);
    const current = {
      leftShoulder: pressed(4),
      rightShoulder: pressed(5),
      triangle: pressed(3),
      cross: pressed(0),
      circle: pressed(1),
      up: pressed(12) || (axes[1] ?? 0) < -0.6,
      down: pressed(13) || (axes[1] ?? 0) > 0.6,
      left: pressed(14) || (axes[0] ?? 0) < -0.6,
      right: pressed(15) || (axes[0] ?? 0) > 0.6,
    };

    if (!dialog.open && current.leftShoulder && !previous.leftShoulder) goToCarouselPage(-1);
    if (!dialog.open && current.rightShoulder && !previous.rightShoulder) goToCarouselPage(1);

    if (!dialog.open && current.triangle && !previous.triangle) {
      playUiSound('move');
      search.focus();
    } else if (dialog.open && current.circle && !previous.circle) {
      playUiSound('back');
      dialog.close();
    } else if ((current.right && !previous.right) || (current.down && !previous.down)
        || (current.left && !previous.left) || (current.up && !previous.up)) {
      const modalControls = [...dialog.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled])')]
        .filter((element) => element.getClientRects().length);
      const elements = dialog.open ? modalControls : focusables();
      const index = elements.indexOf(document.activeElement);
      const forward = (current.right && !previous.right) || (current.down && !previous.down);
      const offset = forward ? 1 : -1;
      const next = elements.length
        ? elements[(Math.max(0, index) + offset + elements.length) % elements.length]
        : null;
      if (next) {
        next.focus();
        playUiSound('move');
      }
    } else if (current.cross && !previous.cross) {
      const active = document.activeElement;
      if (active?.matches('a[href],button,.app-card')) active.click();
    }
    gamepadShoulders.set(gamepad.index, current);
  }
  if (connected) {
    gamepadPolling = true;
    window.requestAnimationFrame(pollGamepadShoulders);
  }
}

function startGamepadPolling() {
  if (gamepadPolling) return;
  gamepadPolling = true;
  window.requestAnimationFrame(pollGamepadShoulders);
}

window.addEventListener('gamepadconnected', startGamepadPolling);
window.addEventListener('gamepaddisconnected', (event) => gamepadShoulders.delete(event.gamepad.index));
if (navigator.getGamepads?.().some(Boolean)) startGamepadPolling();
$('#detail-favorite').addEventListener('click', () => {
  if (state.activeItem) toggleFavorite(state.activeItem.id);
});
$('.close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => {
  if (event.target === dialog) dialog.close();
});

function focusables() {
  return [...document.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),.app-card[tabindex="0"]')]
    .filter((element) => element.getClientRects().length && !element.closest('dialog[open]'));
}

document.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() === 'h' && !dialog.open
      && !['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)
      && !event.target.isContentEditable) {
    event.preventDefault();
    location.hash = 'home';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  if (event.key === 'F1') {
    event.preventDefault();
    search.focus();
  }
  if (!dialog.open && event.key === 'PageUp') {
    event.preventDefault();
    goToCarouselPage(-1);
  }
  if (!dialog.open && event.key === 'PageDown') {
    event.preventDefault();
    goToCarouselPage(1);
  }
  if (event.key === 'Escape' && !dialog.open) search.blur();
  const isEditable = event.target instanceof HTMLElement
    && (event.target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName));
  if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(event.key)
      && !dialog.open && !isEditable) {
    const elements = focusables();
    const index = elements.indexOf(document.activeElement);
    const direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
    if (elements.length) {
      event.preventDefault();
      const nextIndex = index < 0
        ? 0
        : (index + direction + elements.length) % elements.length;
      elements[nextIndex].focus();
    }
  }
});

loadFavorites();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js?v=hades-auto-refresh-v4', { updateViaCache: 'none' })
      .then((registration) => registration.update())
      .catch((error) => console.warn('[HADES Store] Atualização automática indisponível:', error));
  }, { once: true });
}

fetch('catalog/catalog.json?v=hades-catalog-total-11')
  .then((response) => {
    if (!response.ok) throw new Error('Catálogo indisponível (' + response.status + ')');
    return response.json();
  })
  .then((data) => {
    if (!Array.isArray(data)) throw new Error('Formato de catálogo inválido');
    state.catalog = data.filter((item) => item && typeof item.id === 'string' && typeof item.name === 'string');
    const knownIds = new Set(state.catalog.map((item) => item.id));
    state.favorites = new Set([...state.favorites].filter((id) => knownIds.has(id)));
    saveFavorites();
    render();
    setStatus('CATÁLOGO ONLINE');
  })
  .catch((error) => {
    state.catalog = [];
    render();
    setStatus('ERRO AO CARREGAR CATÁLOGO', 'error');
    $('#results-count').textContent = 'Não foi possível carregar os itens.';
    console.error('[HADES Store]', error);
  });
