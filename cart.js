const cartItemsContainer = document.getElementById('cart-items');
const cartCount = document.getElementById('cart-count');
const cartTotal = document.getElementById('cart-total');
const checkoutForm = document.getElementById('checkout-form');
const clearCartButton = document.getElementById('clear-cart-btn');
const checkoutMessage = document.getElementById('checkout-message');

function getBooksData() {
  return window.refreshBooks ? window.refreshBooks() : (window.BOOKS ?? []);
}

function getCart() {
  return window.getBookShelfCart ? window.getBookShelfCart() : [];
}

function saveCart(cart) {
  window.saveBookShelfCart?.(cart);
}

function removeFromCart(bookId) {
  const nextCart = getCart().filter((item) => item.id !== bookId);
  saveCart(nextCart);
  renderCart();
}

function updateQuantity(bookId, delta) {
  const nextCart = getCart()
    .map((item) => {
      if (item.id !== bookId) {
        return item;
      }

      return {
        ...item,
        quantity: item.quantity + delta
      };
    })
    .filter((item) => item.quantity > 0);

  saveCart(nextCart);
  renderCart();
}

function clearCart() {
  saveCart([]);
  renderCart();
}

function renderCart() {
  const cart = getCart();
  const booksData = getBooksData();

  if (!cart.length) {
    cartItemsContainer.innerHTML = '<div class="empty-state"><h2>Заявка порожня</h2><p>Додайте книги з каталогу, щоб оформити оренду в Тернополі.</p><a class="cart-btn cart-link" href="index.html">Перейти до каталогу</a></div>';
    cartCount.textContent = '0';
    cartTotal.textContent = '0 грн';
    if (checkoutMessage) {
      checkoutMessage.hidden = true;
      checkoutMessage.textContent = '';
    }
    window.updateCartLinks?.();
    return;
  }

  let total = 0;

  cartItemsContainer.innerHTML = cart.map((item) => {
    const book = booksData.find((entry) => entry.id === item.id);
    if (!book) {
      return '';
    }

    const liveStatus = window.getBookLiveStatus
      ? window.getBookLiveStatus(book.id, book.rentalPeriod ?? 14)
      : { isAvailable: true, className: 'is-available', label: 'Доступна' };

    const itemTotal = book.price * item.quantity;
    total += itemTotal;

    return `
      <article class="cart-item">
        ${window.getBookCoverMarkup ? window.getBookCoverMarkup(book, 'mini-cover') : `<div class="book-cover mini-cover ${book.coverClass}"><span>${book.coverTitle}</span></div>`}
        <div class="cart-item-info">
          <h3>${book.title} — ${book.author}</h3>
          <p>${book.description}</p>
          <p><span class="book-availability-inline ${liveStatus.className}">${liveStatus.label}</span></p>
          <p><strong>Термін оренди:</strong> ${book.rentalPeriod ?? 14} днів · <strong>Застава:</strong> ${book.deposit ?? 0} грн</p>
          <div class="quantity-controls">
            <button class="secondary-btn qty-btn" type="button" data-qty-id="${book.id}" data-delta="-1">−</button>
            <span class="qty-value">${item.quantity}</span>
            <button class="secondary-btn qty-btn" type="button" data-qty-id="${book.id}" data-delta="1">+</button>
          </div>
          <p><strong>${book.price} грн / ${book.rentalPeriod ?? 14} днів</strong> × ${item.quantity} = <strong>${itemTotal} грн</strong></p>
        </div>
        <button class="secondary-btn remove-btn" type="button" data-remove-id="${book.id}">Видалити</button>
      </article>
    `;
  }).join('');

  cartCount.textContent = String(cart.reduce((sum, item) => sum + item.quantity, 0));
  cartTotal.textContent = `${total} грн`;
  window.updateCartLinks?.();

  cartItemsContainer.querySelectorAll('[data-remove-id]').forEach((button) => {
    button.addEventListener('click', () => {
      removeFromCart(button.dataset.removeId);
    });
  });

  cartItemsContainer.querySelectorAll('[data-qty-id]').forEach((button) => {
    button.addEventListener('click', () => {
      updateQuantity(button.dataset.qtyId, Number(button.dataset.delta));
    });
  });
}

clearCartButton?.addEventListener('click', () => {
  clearCart();
});

checkoutForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

  const currentCart = getCart();
  const currentUser = window.getCurrentUser?.();
  const booksData = getBooksData();

  if (!currentCart.length) {
    return;
  }

  if (!currentUser) {
    window.location.href = 'auth.html?redirect=cart.html';
    return;
  }

  const formData = new FormData(checkoutForm);
  const customerName = String(formData.get('name') ?? '').trim();
  const customerPhone = String(formData.get('phone') ?? '').trim();
  const customerAddress = String(formData.get('address') ?? '').trim();
  const pickupDate = String(formData.get('pickupDate') ?? '').trim();

  if (!customerName || !customerPhone || !customerAddress || !pickupDate) {
    return;
  }

  const orderItems = currentCart
    .map((item) => {
      const book = booksData.find((entry) => entry.id === item.id);
      if (!book) {
        return null;
      }

      return {
        id: book.id,
        title: book.title,
        author: book.author,
        price: book.price,
        quantity: item.quantity,
        rentalPeriod: book.rentalPeriod ?? 14,
        deposit: book.deposit ?? 0
      };
    })
    .filter(Boolean);

  const unavailableItems = orderItems.filter((item) => {
    const liveStatus = window.getBookLiveStatus
      ? window.getBookLiveStatus(item.id, item.rentalPeriod)
      : { isAvailable: true };

    if (!liveStatus.isAvailable) {
      return true;
    }

    return !(window.isBookAvailableOnDate?.(item.id, pickupDate, item.rentalPeriod) ?? true);
  });
  if (unavailableItems.length) {
    if (checkoutMessage) {
      checkoutMessage.hidden = false;
      checkoutMessage.classList.add('auth-message-error');
      checkoutMessage.textContent = `На обрану дату вже зайняті: ${unavailableItems.map((item) => item.title).join(', ')}. Оберіть іншу дату отримання.`;
    }
    return;
  }

  const total = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const orders = window.getOrders ? window.getOrders() : [];
  orders.unshift({
    id: `ORD-${Date.now()}`,
    userId: currentUser.id,
    userName: currentUser.name,
    customerName,
    customerPhone,
    customerAddress,
    pickupDate,
    items: orderItems,
    total,
    status: 'Нова заявка',
    createdAt: new Date().toISOString()
  });
  await window.saveOrders?.(orders);

  saveCart([]);
  renderCart();
  checkoutForm.reset();

  if (checkoutMessage) {
    checkoutMessage.hidden = false;
    checkoutMessage.classList.remove('auth-message-error');
    checkoutMessage.textContent = `Дякуємо, ${customerName}! Вашу заявку на оренду прийнято. Ми зв’яжемося за номером ${customerPhone}.`;
  }

  window.location.href = 'index.html?tab=orders';
});

renderCart();

function handleCartDataUpdate(event) {
  const changedKey = event?.key ?? event?.detail?.key;
  if (!changedKey || ['bookShelfOrders', 'bookShelfCustomBooks', 'bookShelfEditedBooks', 'bookShelfCurrentUserId'].includes(changedKey)) {
    renderCart();
  }
}

window.addEventListener('storage', handleCartDataUpdate);
window.addEventListener(window.BOOK_SHELF_DATA_CHANGE_EVENT ?? 'bookShelf:data-changed', handleCartDataUpdate);