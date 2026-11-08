const state = {
  catalog: [],
  category: 'Todos',
  sort: 'featured',
  favorites: new Set(),
  activeItem: null
};

const $ = (selector) => document.querySelector(selector);
const grid = $('#grid');
const search = $('#search');
const empty = $('#empty');
const dialog = $('#details');
const status = $('#catalog-status');
const FAVORITES_KEY = 'hades-store:favorites:v1';

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
  updateStats();
}

function setStatus(message, kind = 'online') {
  if (!status) return;
  status.className = 'status ' + kind;
  status.innerHTML = '<i></i> ' + safe(message);
}

function updateStats() {
  const apps = $('#count-apps');
  const categories = $('#count-categories');
  const favorites = $('#count-favorites');
  if (apps) apps.textContent = String(state.catalog.length).padStart(2, '0');
  if (categories) categories.textContent = String(new Set(state.catalog.map((item) => item.category)).size).padStart(2, '0');
  if (favorites) favorites.textContent = String(state.favorites.size).padStart(2, '0');
}

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

function generatedCover(item) {
  const title = String(item.name || 'PLAYSTATION 4')
    .replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char]);
  const seedText = String(item.id || item.name || 'PS4');
  let seed = 0;
  for (const char of seedText) seed = (seed * 31 + char.charCodeAt(0)) >>> 0;
  const hue = seed % 360;
  const hue2 = (hue + 48 + (seed % 80)) % 360;
  const titleLines = [];
  let line = '';
  for (const word of String(item.name || 'PLAYSTATION 4').split(/\\s+/)) {
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

function coverSource(item) {
  if (item.category === 'Jogos' && (!item.imageUrl || item.imageUrl.endsWith('game-cover.svg'))) return generatedCover(item);
  return item.imageUrl || '';
}

function createCard(item) {
  const card = document.createElement('article');
  card.className = 'app-card';
  card.tabIndex = 0;
  card.setAttribute('role', 'group');
  card.setAttribute('aria-label', 'Ver detalhes de ' + item.name);
  const seed = Number.parseInt(item.icon, 10);
  card.dataset.cover = String(Number.isFinite(seed) ? (seed - 1 + 8) % 8 : state.catalog.indexOf(item) % 8);

  let visual = '<div class="app-icon">' + safe(item.icon || 'H') + '</div>';
  if (item.category === 'Jogos') {
    visual = '<div class="game-physical" aria-hidden="true"><div class="game-cover"><div class="ps4-band">PS4</div><img class="game-cover-art" src="' + safe(coverSource(item)) + '" alt="" loading="lazy"><span class="cover-fallback">' + safe(item.name) + '</span></div></div>';
  } else if (item.category === 'Emuladores') {
    visual = '<div class="game-physical emulator-physical" aria-hidden="true"><div class="game-cover"><div class="ps4-band">PS4 · HOMEBREW</div><img class="game-cover-art" src="' + safe(item.imageUrl || generatedCover(item)) + '" alt="" loading="lazy"><span class="cover-fallback">' + safe(item.name) + '</span></div></div>';
  } else if (item.imageUrl) {
    visual = '<div class="software-art"><img src="' + safe(item.imageUrl) + '" alt="" loading="lazy"><span>APLICATIVO</span></div>';
  }

  card.innerHTML = favoriteButton(item, true) + visual
    + '<h3>' + safe(item.name) + '</h3><p>' + safe(item.description) + '</p>'
    + '<div class="card-bottom"><span class="tag">' + safe(String(item.category || '').toUpperCase()) + '</span>'
    + '<span class="version">' + safe(item.version === 'PS4' ? 'PS4' : 'v' + (item.version || '—')) + '</span></div>';

  const open = (event) => {
    if (event && event.target.closest('[data-favorite]')) return;
    showDetails(item);
  };
  card.addEventListener('click', open);
  card.addEventListener('keydown', (event) => {
    if (event.target.closest('[data-favorite]')) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      showDetails(item);
    }
  });

  const coverImage = card.querySelector('.game-cover-art');
  if (coverImage) coverImage.addEventListener('error', () => {
    coverImage.remove();
    card.querySelector('.game-cover').classList.add('cover-image-missing');
  });
  const softwareImage = card.querySelector('.software-art img');
  if (softwareImage) softwareImage.addEventListener('error', () => {
    softwareImage.remove();
    card.querySelector('.software-art').classList.add('art-image-missing');
  });
  return card;
}

function render() {
  const items = filteredItems();
  grid.replaceChildren(...items.map(createCard));
  empty.hidden = items.length > 0;
  $('#results-count').textContent = items.length + (items.length === 1 ? ' item encontrado' : ' itens encontrados');
  $('#page-count').textContent = items.length ? '1 / ' + items.length : '0 / 0';
  document.querySelectorAll('[data-category]').forEach((button) => {
    const active = button.dataset.category === state.category;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  updateStats();
}

function toggleFavorite(id) {
  if (state.favorites.has(id)) state.favorites.delete(id);
  else state.favorites.add(id);
  saveFavorites();
  render();
  if (state.activeItem && state.activeItem.id === id) updateDetailFavorite(state.activeItem);
}

function updateDetailFavorite(item) {
  const active = state.favorites.has(item.id);
  const button = $('#detail-favorite');
  button.textContent = active ? '★ Remover dos favoritos' : '☆ Salvar favorito';
  button.setAttribute('aria-pressed', String(active));
}

function showDetails(item) {
  state.activeItem = item;
  const image = $('#detail-image');
  const detailImageUrl = coverSource(item);
  image.hidden = !detailImageUrl;
  image.alt = detailImageUrl ? 'Imagem de ' + item.name : '';
  if (detailImageUrl) {
    image.src = detailImageUrl;
    image.onerror = () => { image.hidden = true; };
  } else {
    image.removeAttribute('src');
  }

  $('#detail-category').textContent = String(item.category || '').toUpperCase();
  $('#detail-title').textContent = item.name;
  $('#detail-description').textContent = item.description || 'Sem descrição cadastrada.';
  $('#detail-meta').textContent = 'Versão ' + (item.version || '—') + ' · ' + (item.size || 'Tamanho não informado')
    + (item.language ? ' · ' + item.language : '') + (item.format ? ' · Formato: ' + item.format : '');

  const link = $('#detail-download');
  if (item.downloadUrl && /^https:\/\//i.test(item.downloadUrl)) {
    link.href = item.downloadUrl;
    link.textContent = item.linkLabel || (item.category === 'Jogos' ? 'VER NA PLAYSTATION STORE ↗' : 'ABRIR LINK CADASTRADO ↗');
    link.hidden = false;
  } else {
    link.removeAttribute('href');
    link.hidden = true;
  }

  $('#game-support-links').hidden = item.category !== 'Jogos';
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
  if (item.category === 'Jogos') $('#detail-dlc').href = 'https://store.playstation.com/pt-br/search/' + encodeURIComponent(item.name + ' DLC');
  $('.dialog-note').textContent = item.linkLabel
    ? 'Link externo cadastrado. Confira o destino, a procedência e a compatibilidade do arquivo antes de instalar.'
    : 'Confira edição, idioma, região e compatibilidade na página oficial antes de adquirir.';
  updateDetailFavorite(item);
  if (!dialog.open) dialog.showModal();
}

document.querySelectorAll('[data-category]').forEach((button) => {
  button.addEventListener('click', () => {
    state.category = button.dataset.category;
    render();
  });
});
$('#search-shortcut').addEventListener('click', () => $('#search').focus());
$('#settings-shortcut').addEventListener('click', () => $('#settings-tab').focus());
$('#settings-tab').addEventListener('click', () => { state.category = 'Todos'; render(); $('#search').focus(); });
search.addEventListener('input', render);
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
  if (event.key.toLowerCase() === 'h' && !dialog.open && event.target.tagName !== 'INPUT' && event.target.tagName !== 'TEXTAREA') {
    event.preventDefault();
    location.hash = 'home';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  if (event.key === 'F1') {
    event.preventDefault();
    search.focus();
  }
  if (event.key === 'Escape' && !dialog.open) search.blur();
  if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(event.key)
      && !dialog.open && document.activeElement !== search) {
    const elements = focusables();
    const index = elements.indexOf(document.activeElement);
    const direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
    if (elements.length && index >= 0) {
      event.preventDefault();
      elements[(index + direction + elements.length) % elements.length].focus();
    }
  }
});

function updateClock() {
  const clock = $('#clock');
  if (clock) clock.textContent = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date());
}
updateClock();
window.setInterval(updateClock, 30000);
loadFavorites();

fetch('catalog/catalog.json')
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
