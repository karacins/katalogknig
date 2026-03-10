const adminPage = document.getElementById('admin-page');
const addBookForm = document.getElementById('add-book-form');
const adminBookMessage = document.getElementById('admin-book-message');
const adminOrdersList = document.getElementById('admin-orders-list');
const adminBooksList = document.getElementById('admin-books-list');
const imageFileInput = document.getElementById('image-file-input');
const imagePreview = document.getElementById('image-preview');
const imagePreviewTag = document.getElementById('image-preview-tag');

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-zа-яіїєґ0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function unwrapBookTitle(title) {
  return String(title ?? '').replace(/^«|»$/g, '').trim();
}

function escapeAttribute(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function showAdminBookMessage(text) {
  if (!adminBookMessage) {
    return;
  }

  adminBookMessage.hidden = false;
  adminBookMessage.textContent = text;
  adminBookMessage.classList.remove('auth-message-error');
}

function showAdminBookError(text) {
  if (!adminBookMessage) {
    return;
  }

  adminBookMessage.hidden = false;
  adminBookMessage.textContent = text;
  adminBookMessage.classList.add('auth-message-error');
}

function clearAdminBookMessage() {
  if (!adminBookMessage) {
    return;
  }

  adminBookMessage.hidden = true;
  adminBookMessage.textContent = '';
  adminBookMessage.classList.remove('auth-message-error');
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Не вдалося прочитати файл.'));
    reader.readAsDataURL(file);
  });
}

async function updateImagePreview() {
  const file = imageFileInput?.files?.[0];
  if (!file || !imagePreview || !imagePreviewTag) {
    if (imagePreview) {
      imagePreview.hidden = true;
    }
    return;
  }

  try {
    const previewUrl = await readFileAsDataUrl(file);
    imagePreview.hidden = false;
    imagePreviewTag.src = previewUrl;
  } catch {
    imagePreview.hidden = true;
  }
}

function buildBookPayload(existingBook, formData) {
  const rawTitle = String(formData.get('title') ?? '').trim();

  return {
    ...existingBook,
    title: `«${rawTitle}»`,
    author: String(formData.get('author') ?? '').trim(),
    image: String(formData.get('image') ?? '').trim(),
    category: 'catalog',
    condition: 'Б/у',
    coverClass: String(formData.get('coverClass') ?? existingBook.coverClass ?? 'cover-1'),
    coverTitle: rawTitle,
    price: Number(formData.get('price') ?? existingBook.price ?? 0),
    rentalPeriod: Number(formData.get('rentalPeriod') ?? existingBook.rentalPeriod ?? 14),
    deposit: Number(formData.get('deposit') ?? existingBook.deposit ?? 0),
    pickupLocation: String(formData.get('pickupLocation') ?? existingBook.pickupLocation ?? 'Тернопіль').trim(),
    popularity: Number(existingBook.popularity ?? 50),
    year: Number(formData.get('year') ?? existingBook.year ?? 2026),
    meta: String(formData.get('meta') ?? '').trim() || 'Б/у · Доступна в Тернополі',
    description: String(formData.get('description') ?? '').trim(),
    longDescription: String(formData.get('longDescription') ?? '').trim(),
    publisher: String(formData.get('publisher') ?? '').trim(),
    language: String(formData.get('language') ?? '').trim(),
    pages: Number(formData.get('pages') ?? existingBook.pages ?? 0),
    binding: String(formData.get('binding') ?? '').trim()
  };
}

async function saveEditedBook(bookId, payload) {
  const customBooks = window.getCustomBooks?.() ?? [];
  const isCustomBook = customBooks.some((book) => book.id === bookId);

  if (isCustomBook) {
    const nextCustomBooks = customBooks.map((book) => (book.id === bookId ? payload : book));
    await window.saveCustomBooks?.(nextCustomBooks);
    return;
  }

  const nextEdits = {
    ...(window.getBookEdits?.() ?? {}),
    [bookId]: payload
  };
  await window.saveBookEdits?.(nextEdits);
}

function getEditFormMarkup(book) {
  return `
    <form class="checkout-form admin-edit-form" data-edit-form="${book.id}" hidden>
      <label>Назва
        <input type="text" name="title" value="${escapeAttribute(unwrapBookTitle(book.title))}" required>
      </label>
      <label>Автор
        <input type="text" name="author" value="${escapeAttribute(book.author)}" required>
      </label>
      <div class="admin-edit-grid">
        <label>Оренда, грн
          <input type="number" name="price" min="1" value="${Number(book.price ?? 0)}" required>
        </label>
        <label>Термін, днів
          <input type="number" name="rentalPeriod" min="1" value="${Number(book.rentalPeriod ?? 14)}" required>
        </label>
        <label>Застава, грн
          <input type="number" name="deposit" min="0" value="${Number(book.deposit ?? 0)}" required>
        </label>
        <label>Рік
          <input type="number" name="year" min="1900" value="${Number(book.year ?? 2026)}" required>
        </label>
      </div>
      <label>Мета-лінія
        <input type="text" name="meta" value="${escapeAttribute(book.meta)}" required>
      </label>
      <label>Точка видачі
        <input type="text" name="pickupLocation" value="${escapeAttribute(book.pickupLocation)}" required>
      </label>
      <label>Картинка або URL
        <input type="text" name="image" value="${escapeAttribute(book.image)}">
      </label>
      <label>Стиль обкладинки
        <select name="coverClass" required>
          <option value="cover-1" ${book.coverClass === 'cover-1' ? 'selected' : ''}>Стиль 1</option>
          <option value="cover-2" ${book.coverClass === 'cover-2' ? 'selected' : ''}>Стиль 2</option>
          <option value="cover-3" ${book.coverClass === 'cover-3' ? 'selected' : ''}>Стиль 3</option>
          <option value="cover-4" ${book.coverClass === 'cover-4' ? 'selected' : ''}>Стиль 4</option>
          <option value="cover-5" ${book.coverClass === 'cover-5' ? 'selected' : ''}>Стиль 5</option>
          <option value="cover-6" ${book.coverClass === 'cover-6' ? 'selected' : ''}>Стиль 6</option>
        </select>
      </label>
      <label>Короткий опис
        <textarea name="description" rows="3" required>${book.description ?? ''}</textarea>
      </label>
      <label>Повний опис
        <textarea name="longDescription" rows="4" required>${book.longDescription ?? ''}</textarea>
      </label>
      <div class="admin-edit-grid">
        <label>Видавництво
          <input type="text" name="publisher" value="${escapeAttribute(book.publisher)}" required>
        </label>
        <label>Мова
          <input type="text" name="language" value="${escapeAttribute(book.language)}" required>
        </label>
        <label>Сторінок
          <input type="number" name="pages" min="1" value="${Number(book.pages ?? 1)}" required>
        </label>
        <label>Палітурка
          <input type="text" name="binding" value="${escapeAttribute(book.binding)}" required>
        </label>
      </div>
      <div class="admin-edit-actions">
        <button class="cart-btn" type="submit">Зберегти зміни</button>
        <button class="secondary-btn" type="button" data-cancel-edit="${book.id}">Скасувати</button>
      </div>
    </form>
  `;
}

function renderAdminOrders() {
  const orders = window.getOrders?.() ?? [];
  if (!adminOrdersList) {
    return;
  }

  if (!orders.length) {
    adminOrdersList.innerHTML = '<div class="empty-state"><h2>Замовлень немає</h2><p>Після оформлення вони з’являться тут.</p></div>';
    return;
  }

  adminOrdersList.innerHTML = orders.map((order) => `
    <article class="order-card">
      <div class="order-card-head">
        <div>
          <h3>${order.id}</h3>
          <p>${order.customerName} · ${order.customerPhone}</p>
        </div>
        <div class="admin-order-actions">
          <select class="status-select" data-order-id="${order.id}">
            <option value="Нова заявка" ${order.status === 'Нова заявка' ? 'selected' : ''}>Нова заявка</option>
            <option value="Підтверджено" ${order.status === 'Підтверджено' ? 'selected' : ''}>Підтверджено</option>
            <option value="Книга видана" ${order.status === 'Книга видана' ? 'selected' : ''}>Книга видана</option>
            <option value="Повернено" ${order.status === 'Повернено' ? 'selected' : ''}>Повернено</option>
          </select>
          <button class="secondary-btn" type="button" data-delete-order="${order.id}">Видалити</button>
        </div>
      </div>
      <p><strong>Книга:</strong> ${(order.items ?? []).map((item) => `${item.title} — ${item.author}${item.quantity > 1 ? ` · ${item.quantity} шт.` : ''}`).join(', ') || 'Не вказано'}</p>
      <p><strong>Точка видачі:</strong> ${order.customerAddress}</p>
      <p><strong>Дата отримання:</strong> ${order.pickupDate || 'Не вказана'}</p>
      <p><strong>Користувач:</strong> ${order.userName || 'Невідомо'}</p>
      <p><strong>Вартість оренди:</strong> ${order.total} грн</p>
    </article>
  `).join('');

  adminOrdersList.querySelectorAll('[data-order-id]').forEach((select) => {
    select.addEventListener('change', async () => {
      const ordersList = window.getOrders?.() ?? [];
      const order = ordersList.find((item) => item.id === select.dataset.orderId);
      if (!order) {
        return;
      }

      order.status = select.value;
      await window.saveOrders?.(ordersList);
      renderAdminOrders();
      renderAdminBooks();
    });
  });

  adminOrdersList.querySelectorAll('[data-delete-order]').forEach((button) => {
    button.addEventListener('click', async () => {
      const nextOrders = (window.getOrders?.() ?? []).filter((order) => order.id !== button.dataset.deleteOrder);
      await window.saveOrders?.(nextOrders);
      showAdminBookMessage('Замовлення видалено. Книга знову доступна для оренди.');
      renderAdminOrders();
      renderAdminBooks();
    });
  });
}

function renderAdminBooks() {
  const allBooks = window.refreshBooks ? window.refreshBooks() : (window.BOOKS ?? []);
  const customBooks = window.getCustomBooks?.() ?? [];
  if (!adminBooksList) {
    return;
  }

  if (!allBooks.length) {
    adminBooksList.innerHTML = '<div class="empty-state"><h2>Книг поки немає</h2><p>Скористайтеся формою вище, щоб додати нову книгу.</p></div>';
    return;
  }

  adminBooksList.innerHTML = allBooks.map((book) => {
    const reservations = window.getBookReservations ? window.getBookReservations(book.id) : [];
    const liveStatus = window.getBookLiveStatus
      ? window.getBookLiveStatus(book.id, book.rentalPeriod ?? 14)
      : { isAvailable: true, className: 'is-available', shortLabel: 'Доступна' };
    const statusText = liveStatus.isAvailable ? 'Доступна зараз' : liveStatus.shortLabel;
    const availabilityMarkup = reservations.length
      ? `<ul class="availability-list compact">${reservations.map((reservation) => `<li>${window.formatShortDate ? window.formatShortDate(reservation.start) : ''} — ${window.formatShortDate ? window.formatShortDate(reservation.end) : ''} · ${reservation.status}</li>`).join('')}</ul>`
      : '<p class="availability-empty">Книга зараз доступна.</p>';
    const isCustomBook = customBooks.some((item) => item.id === book.id);

    return `
      <article class="cart-item admin-book-item">
        ${window.getBookCoverMarkup ? window.getBookCoverMarkup(book, 'mini-cover') : ''}
        <div class="cart-item-info">
          <h3>${book.title} — ${book.author}</h3>
          <p>${book.description}</p>
          <p><span class="book-availability-inline ${liveStatus.className}">${statusText}</span></p>
          <p><strong>${book.price} грн / ${book.rentalPeriod ?? 14} днів</strong></p>
          <p><strong>Застава:</strong> ${book.deposit ?? 0} грн · <strong>Видача:</strong> ${book.pickupLocation ?? 'Тернопіль'}</p>
          <div class="availability-admin-block">
            <strong>Календар доступності:</strong>
            ${availabilityMarkup}
          </div>
          ${getEditFormMarkup(book)}
        </div>
        <div class="admin-book-actions">
          <button class="secondary-btn" type="button" data-edit-book="${book.id}">Редагувати</button>
          ${isCustomBook ? `<button class="secondary-btn" type="button" data-delete-book="${book.id}">Видалити</button>` : '<span class="form-hint">Базова книга</span>'}
        </div>
      </article>
    `;
  }).join('');

  adminBooksList.querySelectorAll('[data-edit-book]').forEach((button) => {
    button.addEventListener('click', () => {
      const form = adminBooksList.querySelector(`[data-edit-form="${button.dataset.editBook}"]`);
      if (form) {
        form.hidden = !form.hidden;
      }
    });
  });

  adminBooksList.querySelectorAll('[data-cancel-edit]').forEach((button) => {
    button.addEventListener('click', () => {
      const form = adminBooksList.querySelector(`[data-edit-form="${button.dataset.cancelEdit}"]`);
      if (form) {
        form.hidden = true;
      }
    });
  });

  adminBooksList.querySelectorAll('[data-edit-form]').forEach((form) => {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      clearAdminBookMessage();

      const bookId = form.dataset.editForm;
      const existingBook = allBooks.find((item) => item.id === bookId);
      if (!existingBook) {
        showAdminBookError('Не вдалося знайти книгу для редагування.');
        return;
      }

      const updatedBook = buildBookPayload(existingBook, new FormData(form));
      await saveEditedBook(bookId, updatedBook);
      window.refreshBooks?.();
      showAdminBookMessage(`Зміни для книги ${updatedBook.title} збережено.`);
      renderAdminBooks();
    });
  });

  adminBooksList.querySelectorAll('[data-delete-book]').forEach((button) => {
    button.addEventListener('click', async () => {
      const nextBooks = (window.getCustomBooks?.() ?? []).filter((book) => book.id !== button.dataset.deleteBook);
      await window.saveCustomBooks?.(nextBooks);
      window.refreshBooks?.();
      renderAdminBooks();
    });
  });
}

const currentUser = window.getCurrentUser?.();
if (!currentUser || currentUser.role !== 'admin') {
  if (adminPage) {
    adminPage.innerHTML = '<section class="empty-state"><h1>Доступ заборонено</h1><p>Увійдіть під акаунтом адміністратора, щоб керувати замовленнями та книгами.</p><a class="cart-btn cart-link" href="auth.html">Увійти</a></section>';
  }
} else {
  imageFileInput?.addEventListener('change', () => {
    updateImagePreview();
  });

  addBookForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearAdminBookMessage();

    const formData = new FormData(addBookForm);
    const title = String(formData.get('title') ?? '').trim();
    const author = String(formData.get('author') ?? '').trim();
    const id = `${slugify(title)}-${Date.now()}`;
    const imageFromInput = String(formData.get('image') ?? '').trim();
    const imageFile = imageFileInput?.files?.[0];
    let image = imageFromInput;

    if (imageFile) {
      const maxFileSize = 1.5 * 1024 * 1024;
      if (imageFile.size > maxFileSize) {
        showAdminBookError('Файл занадто великий для демо-версії. Оберіть зображення до 1.5 МБ.');
        return;
      }

      try {
        image = await readFileAsDataUrl(imageFile);
      } catch {
        showAdminBookError('Не вдалося завантажити зображення. Спробуйте інший файл.');
        return;
      }
    }

    const newBook = {
      id,
      title: `«${title}»`,
      author,
      image,
      category: 'catalog',
      condition: 'Б/у',
      coverClass: String(formData.get('coverClass') ?? 'cover-1'),
      coverTitle: title,
      price: Number(formData.get('price') ?? 0),
      rentalPeriod: Number(formData.get('rentalPeriod') ?? 14),
      deposit: Number(formData.get('deposit') ?? 0),
      pickupLocation: String(formData.get('pickupLocation') ?? 'Тернопіль').trim(),
      popularity: 50,
      year: Number(formData.get('year') ?? 2026),
      meta: String(formData.get('meta') ?? '').trim() || 'Б/у · Доступна в Тернополі',
      description: String(formData.get('description') ?? '').trim(),
      longDescription: String(formData.get('longDescription') ?? '').trim(),
      publisher: String(formData.get('publisher') ?? '').trim(),
      language: String(formData.get('language') ?? '').trim(),
      pages: Number(formData.get('pages') ?? 0),
      binding: String(formData.get('binding') ?? '').trim()
    };

    const nextBooks = [...(window.getCustomBooks?.() ?? []), newBook];
    await window.saveCustomBooks?.(nextBooks);
    window.refreshBooks?.();
    addBookForm.reset();
    if (imagePreview) {
      imagePreview.hidden = true;
    }
    showAdminBookMessage('Книгу успішно додано в каталог оренди.');
    renderAdminBooks();
  });

  renderAdminOrders();
  renderAdminBooks();

  const handleAdminDataUpdate = (event) => {
    const changedKey = event?.key ?? event?.detail?.key;
    if (!changedKey || ['bookShelfOrders', 'bookShelfCustomBooks', 'bookShelfEditedBooks'].includes(changedKey)) {
      renderAdminOrders();
      renderAdminBooks();
    }
  };

  window.addEventListener('storage', handleAdminDataUpdate);
  window.addEventListener(window.BOOK_SHELF_DATA_CHANGE_EVENT ?? 'bookShelf:data-changed', handleAdminDataUpdate);
}
