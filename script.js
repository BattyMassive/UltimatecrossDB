let cards = [];
const results = document.getElementById('results');
const cardModal = document.getElementById('card-modal');
const closeModalButton = document.getElementById('close-card-modal');
const inputEl = document.getElementById('db_query');
const setFilterEl = document.getElementById('card_set_filter');
const pageButtons = document.querySelectorAll('.topbar_button');
const pages = document.querySelectorAll('.page');
const cardsDir = 'cards';
const cardIndexFile = `${cardsDir}/index.txt`;

init();

pageButtons.forEach(button => {
  button.addEventListener('click', () => showPage(button.dataset.page));
});

function showPage(pageId) {
  pages.forEach(page => {
    const isActive = page.id === pageId;
    page.classList.toggle('active_page', isActive);
    page.classList.toggle('hidden', !isActive);
    page.setAttribute('aria-hidden', String(!isActive));
  });

  pageButtons.forEach(button => {
    const isActive = button.dataset.page === pageId;
    button.classList.toggle('active', isActive);
  });
}

async function init() {
  try {
    const fileList = await fetchCardIndex();
    cards = await loadCardsFromFiles(fileList);
    cards = normalizeCards(cards);
    renderResults(cards.filter(c => c.text && (setFilterEl.value === 'all' || c.set === setFilterEl.value)));
  } catch (error) {
    results.innerHTML = '<p class="error">Failed to load card files.</p>';
    console.error(error);
  }
}

async function fetchCardIndex() {
  try {
    const response = await fetch(cardIndexFile);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${cardIndexFile}: ${response.status}`);
    }

    const text = await response.text();
    const fileList = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    if (fileList.length) {
      return fileList.sort(compareNaturalStrings);
    }

    throw new Error(`Empty index file: ${cardIndexFile}`);
  } catch (error) {
    console.warn('Card index not found or empty, falling back to index.json or template files', error);
    try {
      const jsonResponse = await fetch(`${cardsDir}/index.json`);
      if (jsonResponse.ok) {
        return await jsonResponse.json();
      }
    } catch (fallbackError) {
      console.warn('Fallback index.json load failed', fallbackError);
    }
    return ['template.txt'];
  }
}

async function loadCardsFromFiles(fileList) {
  const files = Array.isArray(fileList) && fileList.length ? fileList : ['template.txt'];
  const loaded = await Promise.all(files.map(fetchCardFile));
  return loaded.filter(Boolean);
}

async function fetchCardFile(filename) {
  const filePath = `${cardsDir}/${filename}`;
  try {
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${filePath}: ${response.status}`);
    }

    if (filename.toLowerCase().endsWith('.json')) {
      return await response.json();
    }

    const raw = await response.text();
    return parseCardText(raw);
  } catch (error) {
    console.warn(`Unable to load card file ${filename}:`, error);
    return null;
  }
}

function parseCardText(rawText) {
  const card = {};
  rawText.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }

    const separatorIndex = trimmed.indexOf(':');
    if (separatorIndex === -1) {
      return;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    card[key] = value;
  });

  return card;
}

function normalizeCards(list) {
  return list.map(card => {
    if (!card.set && typeof card.id === 'string') {
      const num = parseInt(card.id.split('-')[1], 10);
      card.set = !Number.isNaN(num) ? (num % 2 === 1 ? '1' : '2') : 'all';
    }

    return {
      id: card.id || 'unknown',
      title: card.title || 'Untitled Card',
      text: card.text || 'No description available.',
      image: card.image || 'images/card1.png',
      set: card.set || 'all',
      atk: card.atk || '',
      def: card.def || '',
      cost: card.cost || '',
      type: card.type || '',
      rarity: card.rarity || '',
      artist: card.artist || ''
    };
  });
}

function compareNaturalStrings(a, b) {
  const regex = /(\d+)|([^\d]+)/g;
  const aParts = String(a).toLowerCase().match(regex) || [];
  const bParts = String(b).toLowerCase().match(regex) || [];

  while (aParts.length && bParts.length) {
    const aPart = aParts.shift();
    const bPart = bParts.shift();

    const aNum = Number(aPart);
    const bNum = Number(bPart);

    if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
      if (aNum !== bNum) return aNum - bNum;
      continue;
    }

    if (aPart !== bPart) {
      return aPart.localeCompare(bPart, undefined, { sensitivity: 'base' });
    }
  }

  return aParts.length - bParts.length;
}

function renderResults(list) {
  results.innerHTML = '';
  if (!list || list.length === 0) {
    results.innerHTML = '<p class="error">No cards found.</p>';
    return;
  }

  const fragment = document.createDocumentFragment();

  list.forEach(card => {
    const cardElement = document.createElement('article');
    cardElement.className = 'card';
    cardElement.setAttribute('data-id', card.id);
    cardElement.setAttribute('aria-label', `${card.title}: ${card.text}`);

    const img = document.createElement('img');
    img.src = card.image;
    img.alt = card.title;
    // Add image (overlay/title removed)
    cardElement.append(img);

    cardElement.addEventListener('click', () => selectCard(card, cardElement));
    fragment.appendChild(cardElement);
  });

  results.appendChild(fragment);
}

function selectCard(card, cardElement) {
  const activeCard = document.querySelector('.card.selected');
  if (activeCard) {
    activeCard.classList.remove('selected');
  }

  if (cardElement) {
    cardElement.classList.add('selected');
  }

  renderCardModal(card);
}

function closeCardModal() {
  cardModal.classList.add('hidden');
  const activeCard = document.querySelector('.card.selected');
  if (activeCard) {
    activeCard.classList.remove('selected');
  }
}

function renderCardModal(card) {
  if (!card) {
    cardModal.classList.add('hidden');
    return;
  }

  cardModal.classList.remove('hidden');

  document.getElementById('card-modal-image').src = card.image;
  document.getElementById('card-modal-image').alt = card.title;
  document.getElementById('card-modal-title').textContent = card.title;
  document.getElementById('card-modal-text').textContent = card.text;

  const metaDiv = document.getElementById('card-modal-meta');
  metaDiv.innerHTML = '';
  
  const metaItems = [];
  if (card.cost) metaItems.push(`<span>Cost: ${escapeHtml(card.cost)}</span>`);
  if (card.type) metaItems.push(`<span>Type: ${escapeHtml(card.type)}</span>`);
  if (card.atk) metaItems.push(`<span>ATK: ${escapeHtml(card.atk)}</span>`);
  if (card.def) metaItems.push(`<span>DEF: ${escapeHtml(card.def)}</span>`);
  if (card.rarity) metaItems.push(`<span>Rarity: ${escapeHtml(card.rarity)}</span>`);
  if (card.set && card.set !== 'all') metaItems.push(`<span>Set ${escapeHtml(card.set)}</span>`);
  
  metaDiv.innerHTML = metaItems.join('');

  const artistDiv = document.getElementById('card-modal-artist');
  if (card.artist) {
    artistDiv.textContent = `Artist: ${card.artist}`;
  } else {
    artistDiv.textContent = '';
  }
}

inputEl.addEventListener('input', handleFilterChange);
setFilterEl.addEventListener('change', handleFilterChange);
if (closeModalButton) {
  closeModalButton.addEventListener('click', closeCardModal);
}

// Close modal when clicking the overlay
const modalOverlay = document.querySelector('.card-modal-overlay');
if (modalOverlay) {
  modalOverlay.addEventListener('click', closeCardModal);
}

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !cardModal.classList.contains('hidden')) {
    closeCardModal();
  }
});

function handleFilterChange() {
  const q = inputEl.value.trim().toLowerCase();
  const parts = q ? q.split(/\s+/).filter(Boolean) : [];
  
  // Separate identifier queries from regular keywords
  const identifierQueries = {};
  const keywords = [];
  
  parts.forEach(part => {
    const match = part.match(/^([a-z]+):(.+)$/);
    if (match) {
      const [, identifier, value] = match;
      identifierQueries[identifier] = value;
    } else {
      keywords.push(part);
    }
  });

  const filtered = cards.filter(card => {
    if (!card.text) return false;
    
    // Check regular keyword search
    const titleLower = card.title.toLowerCase();
    const textLower = card.text.toLowerCase();
    const matchesKeywords = keywords.length === 0 || keywords.every(keyword => titleLower.includes(keyword) || textLower.includes(keyword));
    
    // Check identifier queries
    const matchesIdentifiers = Object.entries(identifierQueries).every(([identifier, value]) => {
      if (!(identifier in card)) return false;
      return String(card[identifier]).toLowerCase() === value;
    });
    
    const matchesSet = setFilterEl.value === 'all' || card.set === setFilterEl.value;
    return matchesKeywords && matchesIdentifiers && matchesSet;
  });

  renderResults(filtered);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

