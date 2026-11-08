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
  status.className = 'status ' + kind;
  status.innerHTML = '<i></i> ' + safe(message);
}

function updateStats() {
  $('#count-apps').textContent = String(state.catalog.length).padStart(2, '0');
  $('#count-categories').textContent = String(new Set(state.catalog.map((item) => item.category)).size).padStart(2, '0');
  $('#count-favorites').textContent = String(state.favorites.size).padStart(2, '0');
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

function createCard(item) {
  const card = document.createElement('article');
  card.className = 'app-card';
  card.tabIndex = 0;
  card.setAttribute('role', 'group');
  card.setAttribute('aria-label', 'Ver detalhes de ' + item.name);
  const seed = Number.parseInt(item.icon, 10);
  card.dataset.cover = String(Number.isFinite(seed) ? (seed - 1 + 8) % 8 : state.catalog.indexOf(item) % 8);

  let visual = '<div class="app-icon">' + safe(item.icon || 'H') + '</div>';
  if (item.imageUrl && item.category === 'Jogos') {
    visual = '<div class="game-physical" aria-hidden="true"><div class="game-disc"><span></span></div><div class="game-cover"><div class="ps4-band">PS4</div><img class="game-cover-art" src="' + safe(item.imageUrl) + '" alt="" loading="lazy"><span class="cover-fallback">' + safe(item.name) + '</span></div></div>';
  } else if (item.imageUrl) {
    visual = '<div class="software-art"><img src="' + safe(item.imageUrl) + '" alt="" loading="lazy"><span>' + safe(item.category === 'Emuladores' ? 'EMULADOR' : 'APLICATIVO') + '</span></div>';
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
  document.querySelectorAll('.filter').forEach((button) => {
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
  image.hidden = !item.imageUrl;
  image.alt = item.imageUrl ? 'Imagem de ' + item.name : '';
  if (item.imageUrl) {
    image.src = item.imageUrl;
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
  if (item.category === 'Jogos') $('#detail-dlc').href = 'https://store.playstation.com/pt-br/search/' + encodeURIComponent(item.name + ' DLC');
  $('.dialog-note').textContent = item.linkLabel
    ? 'Link externo cadastrado. Confira o destino, a procedência e a compatibilidade do arquivo antes de instalar.'
    : 'Confira edição, idioma, região e compatibilidade na página oficial antes de adquirir.';
  updateDetailFavorite(item);
  if (!dialog.open) dialog.showModal();
}

document.querySelectorAll('.filter').forEach((button) => {
  button.addEventListener('click', () => {
    state.category = button.dataset.category;
    render();
  });
});
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
  $('#clock').textContent = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date());
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
