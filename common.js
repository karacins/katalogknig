const DEMO_ADMIN_USER = {
  id: 'admin-demo',
  name: 'Адмін',
  email: 'admin@bookshelf.local',
  role: 'admin'
};

const ORDERS_STORAGE_KEY = 'bookShelfOrders';
const CUSTOM_BOOKS_STORAGE_KEY = 'bookShelfCustomBooks';
const BOOK_EDITS_STORAGE_KEY = 'bookShelfEditedBooks';
const CURRENT_USER_STORAGE_KEY = 'bookShelfCurrentUser';
const USERS_CACHE_STORAGE_KEY = 'bookShelfUsersCache';
const BOOK_SHELF_DATA_CHANGE_EVENT = 'bookShelf:data-changed';
const SHARED_DATA_SYNC_INTERVAL = 10000;

function readStorage(key, fallback) {
  try {
    const rawValue = localStorage.getItem(key);
    return rawValue ? JSON.parse(rawValue) : fallback;
  } catch {
    return fallback;
  }
}

function emitDataChange(key, value) {
  window.dispatchEvent(new CustomEvent(BOOK_SHELF_DATA_CHANGE_EVENT, {
    detail: {
      key,
      value
    }
  }));
}

function writeStorage(key, value, shouldEmit = true) {
  localStorage.setItem(key, JSON.stringify(value));
  if (shouldEmit) {
    emitDataChange(key, value);
  }
}

function removeStorage(key, shouldEmit = true) {
  localStorage.removeItem(key);
  if (shouldEmit) {
    emitDataChange(key, null);
  }
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {})
    },
    ...options
  });

  const text = await response.text();
  let payload = {};

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { message: text };
    }
  }

  if (!response.ok) {
    const error = new Error(payload.details || payload.message || 'Помилка сервера.');
    error.payload = payload;
    throw error;
  }

  return payload;
}

function getUsers() {
  return readStorage(USERS_CACHE_STORAGE_KEY, []);
}

function saveUsers(users) {
  writeStorage(USERS_CACHE_STORAGE_KEY, users);
}

function getCurrentUser() {
  return readStorage(CURRENT_USER_STORAGE_KEY, null);
}

function setCurrentUser(user) {
  if (!user) {
    removeStorage(CURRENT_USER_STORAGE_KEY);
    return;
  }

  writeStorage(CURRENT_USER_STORAGE_KEY, user);
}

function getCartStorageKey() {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    return 'bookShelfCart_guest';
  }

  return `bookShelfCart_${currentUser.id}`;
}

function getBookShelfCart() {
  return readStorage(getCartStorageKey(), []);
}

function saveBookShelfCart(cart) {
  writeStorage(getCartStorageKey(), cart);
  updateCartLinks();
}

function mergeGuestCartIntoUser(userId) {
  const guestCart = readStorage('bookShelfCart_guest', []);
  if (!guestCart.length) {
    return;
  }

  const userCartKey = `bookShelfCart_${userId}`;
  const userCart = readStorage(userCartKey, []);

  guestCart.forEach((guestItem) => {
    const existingItem = userCart.find((item) => item.id === guestItem.id);
    if (existingItem) {
      existingItem.quantity += guestItem.quantity;
    } else {
      userCart.push(guestItem);
    }
  });

  writeStorage(userCartKey, userCart);
  localStorage.removeItem('bookShelfCart_guest');
}

function logoutCurrentUser() {
  removeStorage(CURRENT_USER_STORAGE_KEY);
  updateCartLinks();
  renderTopbarAccount();
}

async function loginUser(email, password) {
  try {
    const result = await fetchJson('/api/login', {
      method: 'POST',
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password
      })
    });

    mergeGuestCartIntoUser(result.user.id);
    setCurrentUser(result.user);
    updateCartLinks();
    renderTopbarAccount();
    await syncSharedData();
    return result;
  } catch (error) {
    return { ok: false, message: error.message || 'Невірний email або пароль.' };
  }
}

async function registerUser({ name, email, password }) {
  try {
    const result = await fetchJson('/api/register', {
      method: 'POST',
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password
      })
    });

    mergeGuestCartIntoUser(result.user.id);
    setCurrentUser(result.user);
    updateCartLinks();
    renderTopbarAccount();
    await syncSharedData();
    return result;
  } catch (error) {
    return { ok: false, message: error.message || 'Не вдалося створити акаунт.' };
  }
}

function getOrders() {
  return readStorage(ORDERS_STORAGE_KEY, []);
}

async function saveOrders(orders) {
  writeStorage(ORDERS_STORAGE_KEY, orders);
  const result = await fetchJson('/api/orders', {
    method: 'PUT',
    body: JSON.stringify({ orders })
  });

  writeStorage(ORDERS_STORAGE_KEY, result.orders);
  return result.orders;
}

function getUserOrders() {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    return [];
  }

  return getOrders().filter((order) => order.userId === currentUser.id);
}

function getCustomBooks() {
  return readStorage(CUSTOM_BOOKS_STORAGE_KEY, []);
}

async function saveCustomBooks(books) {
  writeStorage(CUSTOM_BOOKS_STORAGE_KEY, books);
  const result = await fetchJson('/api/custom-books', {
    method: 'PUT',
    body: JSON.stringify({ books })
  });

  writeStorage(CUSTOM_BOOKS_STORAGE_KEY, result.customBooks);
  return result.customBooks;
}

function getBookEdits() {
  return readStorage(BOOK_EDITS_STORAGE_KEY, {});
}

async function saveBookEdits(edits) {
  writeStorage(BOOK_EDITS_STORAGE_KEY, edits);
  const result = await fetchJson('/api/book-edits', {
    method: 'PUT',
    body: JSON.stringify({ edits })
  });

  writeStorage(BOOK_EDITS_STORAGE_KEY, result.bookEdits);
  return result.bookEdits;
}

async function syncSharedData() {
  try {
    const snapshot = await fetchJson('/api/bootstrap');
    writeStorage(ORDERS_STORAGE_KEY, snapshot.orders ?? [], false);
    writeStorage(CUSTOM_BOOKS_STORAGE_KEY, snapshot.customBooks ?? [], false);
    writeStorage(BOOK_EDITS_STORAGE_KEY, snapshot.bookEdits ?? {}, false);
    emitDataChange('bookShelfSync', snapshot);
    return snapshot;
  } catch {
    return {
      orders: getOrders(),
      customBooks: getCustomBooks(),
      bookEdits: getBookEdits()
    };
  }
}

function toDateOnly(dateValue) {
  const date = new Date(dateValue);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(dateValue, days) {
  const date = toDateOnly(dateValue);
  date.setDate(date.getDate() + days);
  return date;
}

function formatShortDate(dateValue) {
  return toDateOnly(dateValue).toLocaleDateString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function getBlockingStatuses() {
  return ['Нова заявка', 'Підтверджено', 'Книга видана'];
}

function getBookReservations(bookId) {
  return getOrders()
    .filter((order) => getBlockingStatuses().includes(order.status) && order.pickupDate)
    .flatMap((order) => order.items
      .filter((item) => item.id === bookId)
      .map((item) => {
        const start = toDateOnly(order.pickupDate);
        const duration = Number(item.rentalPeriod ?? 14);
        const end = addDays(start, Math.max(duration - 1, 0));
        return {
          orderId: order.id,
          status: order.status,
          customerName: order.customerName,
          start,
          end,
          duration
        };
      }))
    .sort((first, second) => first.start - second.start);
}

function datesOverlap(startA, endA, startB, endB) {
  return startA <= endB && startB <= endA;
}

function isBookAvailableOnDate(bookId, pickupDate, rentalPeriod, excludeOrderId) {
  if (!pickupDate) {
    return true;
  }

  const requestedStart = toDateOnly(pickupDate);
  const requestedEnd = addDays(requestedStart, Math.max(Number(rentalPeriod ?? 14) - 1, 0));
  const reservations = getBookReservations(bookId).filter((item) => item.orderId !== excludeOrderId);
  return !reservations.some((reservation) => datesOverlap(requestedStart, requestedEnd, reservation.start, reservation.end));
}

function getNextAvailableDate(bookId, fromDate, rentalPeriod) {
  let cursor = toDateOnly(fromDate || new Date());
  let attempts = 0;

  while (attempts < 366) {
    if (isBookAvailableOnDate(bookId, cursor, rentalPeriod)) {
      return cursor;
    }

    cursor = addDays(cursor, 1);
    attempts += 1;
  }

  return cursor;
}

function getBookLiveStatus(bookId, rentalPeriod, fromDate = new Date()) {
  const reservations = getBookReservations(bookId);
  const hasBlockingReservation = reservations.length > 0;

  if (!hasBlockingReservation) {
    return {
      isAvailable: true,
      className: 'is-available',
      label: 'Доступна',
      shortLabel: 'Доступна',
      nextAvailableDate: toDateOnly(fromDate)
    };
  }

  const lastReservation = reservations[reservations.length - 1];
  const nextAvailableDate = addDays(lastReservation.end, 1);

  return {
    isAvailable: false,
    className: 'is-rented',
    label: 'Орендована',
    shortLabel: `Орендована до ${formatShortDate(nextAvailableDate)}`,
    nextAvailableDate
  };
}

function buildCoverImageMarkup(book) {
  if (!book?.image) {
    return '';
  }

  return `<img class="book-cover-image" src="${book.image}" alt="Обкладинка ${book.coverTitle}" loading="lazy" onload="this.parentElement.classList.add('has-image')" onerror="this.style.display='none'; this.parentElement.classList.remove('has-image')">`;
}

function getBookCoverMarkup(book, extraClass = '') {
  const classes = ['book-cover', extraClass, book.coverClass].filter(Boolean).join(' ');
  return `<div class="${classes}">${buildCoverImageMarkup(book)}<span>${book.coverTitle}</span></div>`;
}

function setTopbarActionContent(element, icon, label) {
  if (!element) {
    return;
  }

  element.innerHTML = `<span class="topbar-item-icon" aria-hidden="true">${icon}</span><span class="topbar-item-label">${label}</span>`;
}

function updateCartLinks() {
  const totalItems = getBookShelfCart().reduce((sum, item) => sum + item.quantity, 0);
  document.querySelectorAll('[data-cart-link]').forEach((element) => {
    setTopbarActionContent(element, '🛒', `Заявка (${totalItems})`);
  });
}

function renderTopbarAccount() {
  const currentUser = getCurrentUser();
  const authLinks = document.querySelectorAll('[data-auth-link]');
  const logoutButtons = document.querySelectorAll('[data-logout-button]');
  const adminLinks = document.querySelectorAll('[data-admin-link]');
  const isAdmin = Boolean(currentUser && currentUser.email === DEMO_ADMIN_USER.email && currentUser.role === 'admin');

  authLinks.forEach((link) => {
    link.hidden = Boolean(currentUser);
    if (!currentUser) {
      link.hidden = false;
      setTopbarActionContent(link, '👤', 'Увійти');
      link.setAttribute('href', 'auth.html');
      return;
    }

    setTopbarActionContent(link, '👤', currentUser.name);
    link.setAttribute('href', 'index.html?tab=orders');
  });

  logoutButtons.forEach((button) => {
    button.hidden = !currentUser;
    if (currentUser) {
      setTopbarActionContent(button, '↩', 'Вийти');
    }
  });

  adminLinks.forEach((link) => {
    link.hidden = !isAdmin;
    if (!link.hidden) {
      setTopbarActionContent(link, '🛠️', 'Адмін');
    }
  });

  document.querySelectorAll('.topbar a[href="index.html?tab=orders"]').forEach((link) => {
    if (!link.hasAttribute('data-auth-link')) {
      setTopbarActionContent(link, '📚', 'Мої оренди');
    }
  });
}

function setupMobileMenu() {
  document.querySelectorAll('.topbar').forEach((topbar) => {
    const topbarInner = topbar.querySelector('.topbar-inner');
    const topbarActions = topbar.querySelector('.topbar-actions');

    if (!topbarInner || !topbarActions) {
      return;
    }

    let primaryLinks = topbarActions.querySelector('.mobile-primary-links');
    if (!primaryLinks) {
      primaryLinks = document.createElement('div');
      primaryLinks.className = 'mobile-primary-links';
      primaryLinks.innerHTML = `
        <a class="secondary-btn topbar-link mobile-primary-link" href="index.html?tab=catalog">Каталог книг</a>
        <a class="secondary-btn topbar-link mobile-primary-link" href="index.html?tab=contacts">Контакти</a>
      `;
      topbarActions.insertBefore(primaryLinks, topbarActions.firstChild);
    }

    let backdrop = document.querySelector('.mobile-menu-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('button');
      backdrop.type = 'button';
      backdrop.className = 'mobile-menu-backdrop';
      backdrop.setAttribute('aria-label', 'Закрити меню');
      document.body.appendChild(backdrop);
    }

    let toggleButton = topbar.querySelector('[data-mobile-menu-toggle]');
    if (!toggleButton) {
      toggleButton = document.createElement('button');
      toggleButton.type = 'button';
      toggleButton.className = 'mobile-menu-toggle';
      toggleButton.setAttribute('data-mobile-menu-toggle', 'true');
      toggleButton.setAttribute('aria-expanded', 'false');
      toggleButton.setAttribute('aria-label', 'Відкрити меню');
      toggleButton.innerHTML = '<span class="mobile-menu-toggle-icon">☰</span>';
      topbarInner.insertBefore(toggleButton, topbarActions);
    }

    const closeMenu = () => {
      topbar.classList.remove('menu-open');
      document.body.classList.remove('mobile-menu-open');
      toggleButton.setAttribute('aria-expanded', 'false');
      toggleButton.setAttribute('aria-label', 'Відкрити меню');
      const icon = toggleButton.querySelector('.mobile-menu-toggle-icon');
      if (icon) {
        icon.textContent = '☰';
      }
    };

    const openMenu = () => {
      topbar.classList.add('menu-open');
      document.body.classList.add('mobile-menu-open');
      toggleButton.setAttribute('aria-expanded', 'true');
      toggleButton.setAttribute('aria-label', 'Закрити меню');
      const icon = toggleButton.querySelector('.mobile-menu-toggle-icon');
      if (icon) {
        icon.textContent = '✕';
      }
    };

    toggleButton.onclick = () => {
      if (topbar.classList.contains('menu-open')) {
        closeMenu();
        return;
      }

      openMenu();
    };

    backdrop.onclick = () => {
      closeMenu();
    };

    topbarActions.querySelectorAll('a, button').forEach((element) => {
      element.addEventListener('click', () => {
        if (window.innerWidth <= 820) {
          closeMenu();
        }
      });
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 820) {
        closeMenu();
      }
    });

    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeMenu();
      }
    });
  });
}

function initTopbarAccount() {
  document.querySelectorAll('[data-logout-button]').forEach((button) => {
    button.addEventListener('click', () => {
      logoutCurrentUser();
      window.location.href = 'index.html';
    });
  });

  setupMobileMenu();
  renderTopbarAccount();
}

window.getUsers = getUsers;
window.saveUsers = saveUsers;
window.getCurrentUser = getCurrentUser;
window.loginUser = loginUser;
window.registerUser = registerUser;
window.logoutCurrentUser = logoutCurrentUser;
window.getBookShelfCart = getBookShelfCart;
window.saveBookShelfCart = saveBookShelfCart;
window.getOrders = getOrders;
window.saveOrders = saveOrders;
window.getUserOrders = getUserOrders;
window.getCustomBooks = getCustomBooks;
window.saveCustomBooks = saveCustomBooks;
window.getBookEdits = getBookEdits;
window.saveBookEdits = saveBookEdits;
window.syncSharedData = syncSharedData;
window.formatShortDate = formatShortDate;
window.getBookReservations = getBookReservations;
window.isBookAvailableOnDate = isBookAvailableOnDate;
window.getNextAvailableDate = getNextAvailableDate;
window.getBookLiveStatus = getBookLiveStatus;
window.updateCartLinks = updateCartLinks;
window.getBookCoverMarkup = getBookCoverMarkup;
window.renderTopbarAccount = renderTopbarAccount;
window.BOOK_SHELF_DATA_CHANGE_EVENT = BOOK_SHELF_DATA_CHANGE_EVENT;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTopbarAccount, { once: true });
} else {
  initTopbarAccount();
}
updateCartLinks();
syncSharedData();
window.addEventListener('focus', () => {
  syncSharedData();
});
window.setInterval(() => {
  syncSharedData();
}, SHARED_DATA_SYNC_INTERVAL);