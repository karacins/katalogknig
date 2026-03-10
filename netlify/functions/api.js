const { getStore } = require('@netlify/blobs');

const INITIAL_STATE = {
  users: [
    {
      id: 'admin-demo',
      name: 'Адмін',
      email: 'admin@bookshelf.local',
      password: 'admin123',
      role: 'admin'
    }
  ],
  orders: [],
  customBooks: [],
  bookEdits: {}
};

function json(statusCode, payload) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    },
    body: JSON.stringify(payload)
  };
}

async function getDb() {
  const store = getStore({ name: 'bookshelf-data', consistency: 'strong' });
  const existing = await store.get('db', { type: 'json' });

  if (existing) {
    return { store, db: existing };
  }

  await store.setJSON('db', INITIAL_STATE);
  return { store, db: JSON.parse(JSON.stringify(INITIAL_STATE)) };
}

async function saveDb(store, db) {
  await store.setJSON('db', db);
  return db;
}

function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };
}

function parseBody(event) {
  if (!event.body) {
    return {};
  }

  try {
    return JSON.parse(event.body);
  } catch {
    return {};
  }
}

exports.handler = async (event) => {
  try {
    const { store, db } = await getDb();
    const method = event.httpMethod;
    const routePath = String(event.path || '').replace(/^\/\.netlify\/functions\/api/, '').replace(/^\/api/, '') || '/';

    if (method === 'GET' && routePath === '/bootstrap') {
      return json(200, {
        customBooks: db.customBooks,
        bookEdits: db.bookEdits,
        orders: db.orders
      });
    }

    if (method === 'POST' && routePath === '/login') {
      const body = parseBody(event);
      const email = String(body.email ?? '').trim().toLowerCase();
      const password = String(body.password ?? '');
      const user = db.users.find((entry) => entry.email.toLowerCase() === email && entry.password === password);

      if (!user) {
        return json(401, { ok: false, message: 'Невірний email або пароль.' });
      }

      return json(200, { ok: true, user: sanitizeUser(user) });
    }

    if (method === 'POST' && routePath === '/register') {
      const body = parseBody(event);
      const name = String(body.name ?? '').trim();
      const email = String(body.email ?? '').trim().toLowerCase();
      const password = String(body.password ?? '');

      if (!name || !email || !password) {
        return json(400, { ok: false, message: 'Заповніть усі поля.' });
      }

      if (db.users.some((entry) => entry.email.toLowerCase() === email)) {
        return json(409, { ok: false, message: 'Користувач з таким email уже існує.' });
      }

      const user = {
        id: `user-${Date.now()}`,
        name,
        email,
        password,
        role: 'user'
      };

      db.users.push(user);
      await saveDb(store, db);
      return json(201, { ok: true, user: sanitizeUser(user) });
    }

    if (method === 'PUT' && routePath === '/orders') {
      const body = parseBody(event);
      db.orders = Array.isArray(body.orders) ? body.orders : [];
      await saveDb(store, db);
      return json(200, { ok: true, orders: db.orders });
    }

    if (method === 'PUT' && routePath === '/custom-books') {
      const body = parseBody(event);
      db.customBooks = Array.isArray(body.books) ? body.books : [];
      await saveDb(store, db);
      return json(200, { ok: true, customBooks: db.customBooks });
    }

    if (method === 'PUT' && routePath === '/book-edits') {
      const body = parseBody(event);
      db.bookEdits = body.edits && typeof body.edits === 'object' ? body.edits : {};
      await saveDb(store, db);
      return json(200, { ok: true, bookEdits: db.bookEdits });
    }

    if (method === 'GET' && routePath === '/users') {
      return json(200, { ok: true, users: db.users.map(sanitizeUser) });
    }

    return json(404, { ok: false, message: 'Маршрут не знайдено.' });
  } catch (error) {
    return json(500, {
      ok: false,
      message: 'Помилка сервера.',
      details: String(error?.message || error)
    });
  }
};
