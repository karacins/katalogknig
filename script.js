const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');
const searchInput = document.getElementById('search-input');
const catalogSections = document.querySelectorAll('#catalog');
const ordersList = document.getElementById('orders-list');
const homeHero = document.querySelector('.header');

function getAllBooks() {
  return window.refreshBooks ? window.refreshBooks() : (window.BOOKS ?? []);
}

function normalizeText(text) {
  return text.toLowerCase().trim();
}

function getBookAvailabilityBadge(book) {
  const liveStatus = window.getBookLiveStatus
    ? window.getBookLiveStatus(book.id, book.rentalPeriod ?? 14)
    : null;

  if (liveStatus) {
    return {
      isAvailable: liveStatus.isAvailable,
      className: liveStatus.className,
      label: liveStatus.label
    };
  }

  return {
    isAvailable: true,
    className: 'is-available',
    label: 'Доступна'
  };
}

function createBookCardMarkup(book) {
  const availabilityBadge = getBookAvailabilityBadge(book);

  return `
    <article
      class="book-card ${availabilityBadge.isAvailable ? 'book-card-available' : 'book-card-busy'}"
      tabindex="0"
      role="link"
      aria-label="Відкрити сторінку книги ${book.coverTitle}"
      data-book-id="${book.id}"
      data-price="${book.price}"
      data-popularity="${book.popularity}"
      data-year="${book.year}"
      data-available="${availabilityBadge.isAvailable ? 'true' : 'false'}"
      data-title="${normalizeText(`${book.title} ${book.author}`)}"
      data-author="${normalizeText(book.author)}"
      data-description="${normalizeText(book.description)}"
    >
      <span class="book-availability-badge ${availabilityBadge.className}">${availabilityBadge.label}</span>
      ${window.getBookCoverMarkup ? window.getBookCoverMarkup(book) : `<div class="book-cover ${book.coverClass}"><span>${book.coverTitle}</span></div>`}
      <p class="book-meta">${book.meta}</p>
      <h2>${book.title} — ${book.author}</h2>
      <p class="price">Оренда: ${book.price} грн / ${book.rentalPeriod ?? 14} днів</p>
    </article>
  `;
}

function mountCatalogCards() {
  const books = getAllBooks();

  catalogSections.forEach((section) => {
    const grid = section.querySelector('.books-grid');
    if (!grid) {
      return;
    }

    const sectionBooks = books;
    grid.innerHTML = sectionBooks.map((book) => createBookCardMarkup(book)).join('');
  });

  bindCardEvents();
}

function refreshCatalog() {
  window.refreshBooks?.();
  mountCatalogCards();
  catalogSections.forEach((section) => {
    renderSection(section);
  });
}

function getCardText(card) {
  const title = card.querySelector('h2')?.textContent ?? '';
  const meta = card.querySelector('.book-meta')?.textContent ?? '';
  const datasetTitle = card.dataset.title ?? '';
  const datasetAuthor = card.dataset.author ?? '';
  const datasetDescription = card.dataset.description ?? '';
  return normalizeText(`${title} ${meta} ${datasetTitle} ${datasetAuthor} ${datasetDescription}`);
}

function sortCards(cards, sortType) {
  const sorted = [...cards];

  const getAvailabilityRank = (card) => (card.dataset.available === 'true' ? 0 : 1);

  const compareWithAvailability = (first, second, fallbackComparator) => {
    const availabilityDifference = getAvailabilityRank(first) - getAvailabilityRank(second);
    if (availabilityDifference !== 0) {
      return availabilityDifference;
    }

    return fallbackComparator(first, second);
  };

  if (sortType === 'cheap') {
    sorted.sort((first, second) => compareWithAvailability(
      first,
      second,
      (left, right) => Number(left.dataset.price) - Number(right.dataset.price)
    ));
    return sorted;
  }

  if (sortType === 'new') {
    sorted.sort((first, second) => compareWithAvailability(
      first,
      second,
      (left, right) => Number(right.dataset.year) - Number(left.dataset.year)
    ));
    return sorted;
  }

  sorted.sort((first, second) => compareWithAvailability(
    first,
    second,
    (left, right) => Number(right.dataset.popularity) - Number(left.dataset.popularity)
  ));
  return sorted;
}

function updateCountLabel(section, count) {
  const countLabel = section.querySelector('.count-label');
  if (!countLabel) {
    return;
  }

  countLabel.textContent = `${count} книг у каталозі`;
}

function updateAvailableCountLabel(section) {
  const availableCountLabel = section.querySelector('.available-count-label');
  if (!availableCountLabel) {
    return;
  }

  const availableCount = Array.from(section.querySelectorAll('.book-card')).filter((card) => card.dataset.available === 'true').length;
  availableCountLabel.textContent = `${availableCount} книг`;
}

function renderSection(section) {
  const grid = section.querySelector('.books-grid');
  if (!grid) {
    return;
  }

  const allCards = Array.from(grid.querySelectorAll('.book-card'));
  const query = normalizeText(searchInput?.value ?? '');
  const availableOnlyChip = section.querySelector('[data-filter="available"]');
  const availableOnly = availableOnlyChip?.classList.contains('active');

  const filteredCards = allCards.filter((card) => {
    if (!query) {
      if (!availableOnly) {
        return true;
      }

      return card.dataset.available === 'true';
    }

    const matchesSearch = getCardText(card).includes(query);
    const matchesAvailability = !availableOnly || card.dataset.available === 'true';

    return matchesSearch && matchesAvailability;
  });

  const activeChip = section.querySelector('.chip[data-sort].active');
  const sortType = activeChip?.dataset.sort ?? 'popular';
  const sortedVisibleCards = sortCards(filteredCards, sortType);

  allCards.forEach((card) => {
    card.hidden = true;
  });

  sortedVisibleCards.forEach((card) => {
    card.hidden = false;
    grid.appendChild(card);
  });

  updateCountLabel(section, sortedVisibleCards.length);
  updateAvailableCountLabel(section);
}

function activateTab(targetId) {
  tabButtons.forEach((item) => item.classList.toggle('active', item.dataset.tab === targetId));
  tabContents.forEach((section) => section.classList.toggle('active', section.id === targetId));

  if (homeHero) {
    homeHero.hidden = targetId !== 'catalog';
  }

  const activeSection = document.getElementById(targetId);
  if (activeSection && activeSection.id === 'catalog') {
    renderSection(activeSection);
  }
}

function formatOrderDate(dateValue) {
  return new Date(dateValue).toLocaleString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function renderOrders() {
  if (!ordersList) {
    return;
  }

  const currentUser = window.getCurrentUser?.();
  if (!currentUser) {
    ordersList.innerHTML = '<div class="empty-state"><h2>Увійдіть в акаунт</h2><p>Щоб бачити свої замовлення, потрібно увійти або зареєструватися.</p><a class="cart-btn cart-link" href="auth.html">Увійти</a></div>';
    return;
  }

  const orders = window.getUserOrders ? window.getUserOrders() : [];
  if (!orders.length) {
    ordersList.innerHTML = '<div class="empty-state"><h2>Замовлень поки немає</h2><p>Після оформлення вони з’являться тут автоматично.</p></div>';
    return;
  }

  ordersList.innerHTML = orders.map((order) => {
    const itemsMarkup = order.items
      .map((item) => `<li>${item.title} — ${item.author} · ${item.quantity} шт. · ${item.price * item.quantity} грн</li>`)
      .join('');

    return `
      <article class="order-card">
        <div class="order-card-head">
          <div>
            <h3>${order.id}</h3>
            <p>Заявка від: ${formatOrderDate(order.createdAt)}</p>
          </div>
          <span class="order-status order-status-${normalizeText(order.status ?? 'Нова заявка').replace(/\s+/g, '-')}">${order.status ?? 'Нова заявка'}</span>
        </div>
        <p><strong>Отримувач:</strong> ${order.customerName}</p>
        <p><strong>Телефон:</strong> ${order.customerPhone}</p>
        <p><strong>Точка видачі:</strong> ${order.customerAddress}</p>
        <p><strong>Дата отримання:</strong> ${order.pickupDate || 'Уточнюється'}</p>
        <ul class="order-items-list">${itemsMarkup}</ul>
        <p class="order-total"><strong>Вартість оренди:</strong> ${order.total} грн</p>
      </article>
    `;
  }).join('');
}

function bindCardEvents() {
  document.querySelectorAll('.book-card').forEach((card) => {
    const openCard = () => {
      const bookId = card.dataset.bookId;
      if (!bookId) {
        return;
      }

      window.open(`product.html?id=${encodeURIComponent(bookId)}`, '_blank');
    };

    card.addEventListener('click', openCard);
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openCard();
      }
    });
  });
}

catalogSections.forEach((section) => {
  const chips = section.querySelectorAll('.chip');
  const sortChips = section.querySelectorAll('.chip[data-sort]');

  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      if (chip.dataset.filter === 'available') {
        chip.classList.toggle('active');
        chip.setAttribute('aria-pressed', chip.classList.contains('active') ? 'true' : 'false');
        renderSection(section);
        return;
      }

      sortChips.forEach((item) => item.classList.remove('active'));
      chip.classList.add('active');
      renderSection(section);
    });
  });
});

if (searchInput) {
  searchInput.addEventListener('input', () => {
    catalogSections.forEach((section) => {
      renderSection(section);
    });
  });
}

tabButtons.forEach((button) => {
  button.addEventListener('click', () => {
    activateTab(button.dataset.tab);
  });
});

mountCatalogCards();
catalogSections.forEach((section) => {
  renderSection(section);
});
renderOrders();

if (homeHero) {
  homeHero.hidden = false;
}

function handleSharedDataUpdate(event) {
  const changedKey = event?.key ?? event?.detail?.key;
  const shouldRefreshCatalog = !changedKey || ['bookShelfOrders', 'bookShelfCustomBooks', 'bookShelfEditedBooks'].includes(changedKey);
  const shouldRefreshOrders = !changedKey || ['bookShelfOrders', 'bookShelfCurrentUserId', 'bookShelfUsers'].includes(changedKey);

  if (shouldRefreshCatalog) {
    refreshCatalog();
  }

  if (shouldRefreshOrders) {
    renderOrders();
    window.renderTopbarAccount?.();
    window.updateCartLinks?.();
  }
}

window.addEventListener('storage', handleSharedDataUpdate);
window.addEventListener(window.BOOK_SHELF_DATA_CHANGE_EVENT ?? 'bookShelf:data-changed', handleSharedDataUpdate);

const tabFromUrl = new URLSearchParams(window.location.search).get('tab');
if (tabFromUrl && document.getElementById(tabFromUrl)) {
  activateTab(tabFromUrl);
}
