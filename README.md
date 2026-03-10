# BookShelf Rental

Сайт підготовлений до двох режимів:
- локально через Node.js сервер
- на Netlify через Functions + Blobs

## Що вже зроблено
- спільні акаунти через сервер
- спільні замовлення для всіх користувачів
- спільне редагування та додавання книг
- серверна база у файлі data/bookshelf-db.json
- статичні сторінки роздаються тим самим сервером

## Потрібно встановити
1. Node.js LTS: https://nodejs.org/
2. Після встановлення перезапустити VS Code або термінал

## Локальний запуск
У папці проєкту:

1. `npm install`
2. `npm start`
3. Відкрити http://localhost:3000

## Демо-адмін
- email: admin@bookshelf.local
- password: admin123

## Деплой
Підійде будь-який хостинг з Node.js:
- Render
- Railway
- VPS

## Netlify
Для Netlify вже підготовлено:
- [netlify.toml](netlify.toml)
- [netlify/functions/api.js](netlify/functions/api.js)

### Як залити на Netlify
1. Завантажити проєкт у GitHub
2. Увійти в https://app.netlify.com
3. Натиснути Add new site → Import an existing project
4. Обрати GitHub-репозиторій
5. Netlify сам підхопить [netlify.toml](netlify.toml)
6. Натиснути Deploy

### Як це працює на Netlify
- статичні сторінки хостяться як звичайний сайт
- запити на `/api/*` йдуть у Netlify Function
- спільні дані зберігаються через Netlify Blobs

### Що важливо
- після першого деплою акаунти, замовлення і книги будуть спільними для всіх користувачів сайту
- демо-адмін лишається той самий: `admin@bookshelf.local` / `admin123`

### Мінімальні кроки для Render
1. Завантажити проєкт у GitHub
2. Створити Web Service
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Port: `3000`

## Важливо
Зараз дані зберігаються у файлі на сервері. Для невеликого одного сервера цього достатньо. Якщо потім захочете масштабування або резервні копії, краще перейти на повноцінну базу даних.
