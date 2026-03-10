const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'bookshelf-db.json');
const defaultBooksPath = path.join(dataDir, 'defaultBooks.json');

fs.mkdirSync(dataDir, { recursive: true });

function parseJson(text, fallback) {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

function createInitialState() {
  return {
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
}

function ensureDbFile() {
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify(createInitialState(), null, 2), 'utf8');
  }
}

function readDb() {
  ensureDbFile();
  const db = parseJson(fs.readFileSync(dbPath, 'utf8'), createInitialState());

  if (!Array.isArray(db.users) || !db.users.length) {
    db.users = createInitialState().users;
  }

  if (!Array.isArray(db.orders)) {
    db.orders = [];
  }

  if (!Array.isArray(db.customBooks)) {
    db.customBooks = [];
  }

  if (!db.bookEdits || typeof db.bookEdits !== 'object') {
    db.bookEdits = {};
  }

  return db;
}

function writeDb(nextDb) {
  fs.writeFileSync(dbPath, JSON.stringify(nextDb, null, 2), 'utf8');
}

function getDefaultBooks() {
  return parseJson(fs.readFileSync(defaultBooksPath, 'utf8'), []);
}

function getUsers() {
  return readDb().users;
}

function createUser(user) {
  const db = readDb();
  db.users.push(user);
  writeDb(db);
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };
}

function findUserByCredentials(email, password) {
  const user = readDb().users.find((entry) => entry.email.toLowerCase() === email.toLowerCase() && entry.password === password);
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

function findUserByEmail(email) {
  const user = readDb().users.find((entry) => entry.email.toLowerCase() === email.toLowerCase());
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

function getOrders() {
  return readDb().orders;
}

function replaceOrders(orders) {
  const db = readDb();
  db.orders = Array.isArray(orders) ? orders : [];
  writeDb(db);
  return db.orders;
}

function getCustomBooks() {
  return readDb().customBooks;
}

function replaceCustomBooks(books) {
  const db = readDb();
  db.customBooks = Array.isArray(books) ? books : [];
  writeDb(db);
  return db.customBooks;
}

function getBookEdits() {
  return readDb().bookEdits;
}

function replaceBookEdits(edits) {
  const db = readDb();
  db.bookEdits = edits && typeof edits === 'object' ? edits : {};
  writeDb(db);
  return db.bookEdits;
}

function bootstrapPayload() {
  const db = readDb();
  return {
    customBooks: db.customBooks,
    bookEdits: db.bookEdits,
    orders: db.orders
  };
}

ensureDbFile();

module.exports = {
  getDefaultBooks,
  getUsers,
  createUser,
  findUserByCredentials,
  findUserByEmail,
  getOrders,
  replaceOrders,
  getCustomBooks,
  replaceCustomBooks,
  getBookEdits,
  replaceBookEdits,
  bootstrapPayload
};
