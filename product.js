const productPage = document.getElementById('product-page');
const params = new URLSearchParams(window.location.search);
const productId = params.get('id');

function getCart() {
  return window.getBookShelfCart ? window.getBookShelfCart() : [];
}

function addToCart(bookId) {
  const cart = getCart();
  const existingItem = cart.find((item) => item.id === bookId);

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({ id: bookId, quantity: 1 });
  }

  window.saveBookShelfCart?.(cart);
}

function renderProduct() {
  const books = window.refreshBooks ? window.refreshBooks() : (window.BOOKS ?? []);
  const product = books.find((book) => book.id === productId);

  if (!product && productPage) {
    productPage.innerHTML = '<section class="empty-state"><h1>Книгу не знайдено</h1><p>Поверніться до каталогу та оберіть книгу ще раз.</p><a class="cart-btn cart-link" href="index.html">Повернутися до каталогу</a></section>';
    return;
  }

  if (!product) {
    return;
  }

  document.title = `${product.title} — ${product.author}`;

  const productCover = document.getElementById('product-cover');
  const productCondition = document.getElementById('product-condition');
  const productTitle = document.getElementById('product-title');
  const productAuthor = document.getElementById('product-author');
  const productPrice = document.getElementById('product-price');
  const productShort = document.getElementById('product-short');
  const productLongDescription = document.getElementById('product-long-description');
  const productMetaGrid = document.getElementById('product-meta-grid');
  const addToCartButton = document.getElementById('add-to-cart');
  const buyNowButton = document.getElementById('buy-now');
  const availabilitySummary = document.getElementById('availability-summary');
  const availabilityList = document.getElementById('availability-list');

  productCover.classList.add(product.coverClass);
  productCover.innerHTML = `${product.image ? `<img class="book-cover-image" src="${product.image}" alt="Обкладинка ${product.coverTitle}" loading="lazy" onload="this.parentElement.classList.add('has-image')" onerror="this.style.display='none'; this.parentElement.classList.remove('has-image')">` : ''}<span>${product.coverTitle}</span>`;
  productCondition.textContent = product.condition;
  productTitle.textContent = `${product.title} — ${product.author}`;
  productAuthor.textContent = product.meta;
  productPrice.textContent = `${product.price} грн / ${product.rentalPeriod ?? 14} днів`;
  productShort.textContent = `${product.description} Забрати книгу можна в Тернополі.`;
  productLongDescription.textContent = product.longDescription;

  const metaItems = [
    ['Автор', product.author],
    ['Видавництво', product.publisher],
    ['Мова', product.language],
    ['Сторінок', product.pages],
    ['Палітурка', product.binding],
    ['Стан', product.condition],
    ['Термін оренди', `${product.rentalPeriod ?? 14} днів`],
    ['Застава', `${product.deposit ?? 0} грн`],
    ['Видача', product.pickupLocation ?? 'Тернопіль']
  ];

  productMetaGrid.innerHTML = metaItems
    .map(([label, value]) => `<div class="product-meta-item"><span>${label}</span><strong>${value}</strong></div>`)
    .join('');

  const reservations = window.getBookReservations ? window.getBookReservations(product.id) : [];
  const liveStatus = window.getBookLiveStatus
    ? window.getBookLiveStatus(product.id, product.rentalPeriod ?? 14)
    : { isAvailable: true, shortLabel: 'Доступна', nextAvailableDate: new Date() };

  if (availabilitySummary) {
    availabilitySummary.innerHTML = liveStatus.isAvailable
      ? `<p class="availability-ok">Книга доступна для оренди зараз. Найближча дата видачі: <strong>${window.formatShortDate ? window.formatShortDate(new Date()) : ''}</strong>.</p>`
      : `<p class="availability-rented">Книга зараз орендована. Найближча вільна дата: <strong>${window.formatShortDate ? window.formatShortDate(liveStatus.nextAvailableDate) : ''}</strong>.</p>`;
  }

  if (availabilityList) {
    availabilityList.innerHTML = reservations.length
      ? `<ul class="availability-list">${reservations.map((reservation) => `<li>${window.formatShortDate ? window.formatShortDate(reservation.start) : ''} — ${window.formatShortDate ? window.formatShortDate(reservation.end) : ''} · ${reservation.status}</li>`).join('')}</ul>`
      : '<p class="availability-empty">На найближчий час бронювань немає.</p>';
  }

  addToCartButton.disabled = !liveStatus.isAvailable;
  buyNowButton.disabled = !liveStatus.isAvailable;
  addToCartButton.textContent = liveStatus.isAvailable ? 'Додати в заявку' : 'Книга орендована';
  buyNowButton.textContent = liveStatus.isAvailable ? 'Оформити оренду' : 'Недоступна зараз';

  addToCartButton.onclick = () => {
    if (!liveStatus.isAvailable) {
      return;
    }

    addToCart(product.id);
    addToCartButton.textContent = 'Додано в заявку';
  };

  buyNowButton.onclick = () => {
    if (!liveStatus.isAvailable) {
      return;
    }

    addToCart(product.id);
    window.location.href = 'cart.html';
  };
}

renderProduct();

function handleProductDataUpdate(event) {
  const changedKey = event?.key ?? event?.detail?.key;
  if (!changedKey || ['bookShelfOrders', 'bookShelfCustomBooks', 'bookShelfEditedBooks'].includes(changedKey)) {
    renderProduct();
  }
}

window.addEventListener('storage', handleProductDataUpdate);
window.addEventListener(window.BOOK_SHELF_DATA_CHANGE_EVENT ?? 'bookShelf:data-changed', handleProductDataUpdate);