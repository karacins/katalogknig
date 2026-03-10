const path = require('path');
const express = require('express');
const {
  getUsers,
  createUser,
  findUserByCredentials,
  findUserByEmail,
  replaceOrders,
  replaceCustomBooks,
  replaceBookEdits,
  bootstrapPayload
} = require('./db');

const app = express();
const rootDir = path.join(__dirname, '..');
const port = Number(process.env.PORT || 3000);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));
app.use('/covers', express.static(path.join(rootDir, 'covers')));
app.use(express.static(rootDir));

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

app.get('/api/bootstrap', (_request, response) => {
  response.json(bootstrapPayload());
});

app.post('/api/login', (request, response) => {
  const email = String(request.body.email ?? '').trim();
  const password = String(request.body.password ?? '');
  const user = findUserByCredentials(email, password);

  if (!user) {
    response.status(401).json({ ok: false, message: 'Невірний email або пароль.' });
    return;
  }

  response.json({ ok: true, user: sanitizeUser(user) });
});

app.post('/api/register', (request, response) => {
  const name = String(request.body.name ?? '').trim();
  const email = String(request.body.email ?? '').trim().toLowerCase();
  const password = String(request.body.password ?? '');

  if (!name || !email || !password) {
    response.status(400).json({ ok: false, message: 'Заповніть усі поля.' });
    return;
  }

  if (findUserByEmail(email)) {
    response.status(409).json({ ok: false, message: 'Користувач з таким email уже існує.' });
    return;
  }

  const user = createUser({
    id: `user-${Date.now()}`,
    name,
    email,
    password,
    role: 'user'
  });

  response.status(201).json({ ok: true, user: sanitizeUser(user) });
});

app.put('/api/orders', (request, response) => {
  const orders = Array.isArray(request.body.orders) ? request.body.orders : [];
  const nextOrders = replaceOrders(orders);
  response.json({ ok: true, orders: nextOrders });
});

app.put('/api/custom-books', (request, response) => {
  const books = Array.isArray(request.body.books) ? request.body.books : [];
  const nextBooks = replaceCustomBooks(books);
  response.json({ ok: true, customBooks: nextBooks });
});

app.put('/api/book-edits', (request, response) => {
  const edits = request.body.edits && typeof request.body.edits === 'object' ? request.body.edits : {};
  const nextEdits = replaceBookEdits(edits);
  response.json({ ok: true, bookEdits: nextEdits });
});

app.get('/api/users', (_request, response) => {
  response.json({ ok: true, users: getUsers().map(sanitizeUser) });
});

app.get('*', (request, response, next) => {
  if (request.path.startsWith('/api/')) {
    next();
    return;
  }

  const filePath = path.join(rootDir, request.path === '/' ? 'index.html' : request.path);
  response.sendFile(filePath, (error) => {
    if (!error) {
      return;
    }

    response.sendFile(path.join(rootDir, 'index.html'));
  });
});

app.listen(port, () => {
  console.log(`BookShelf server running on http://localhost:${port}`);
});
