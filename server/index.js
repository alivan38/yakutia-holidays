const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const proposalsRoutes = require('./routes/proposals');
const trashRoutes = require('./routes/trash');
const holidaysRoutes = require('./routes/holidays');

const app = express();
const PORT = process.env.PORT || 5000;
const ADMIN_KEY = process.env.ADMIN_KEY || 'sp123';


app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/holidays', holidaysRoutes);

// Публичные и защищённые маршруты proposals (защита внутри proposals.js)
app.use('/api/proposals', proposalsRoutes);

// Защита для корзины (все операции требуют ключ)
app.use('/api/trash', (req, res, next) => {
  if (req.query.key !== ADMIN_KEY) {
    return res.status(403).json({ error: 'Неверный ключ' });
  }
  next();
});
app.use('/api/trash', trashRoutes);

// Редирект на клиентскую админку
app.get('/admin', (req, res) => {
  if (req.query.key !== ADMIN_KEY) {
    return res.status(403).send('Доступ запрещён. Укажите правильный ключ ?key=...');
  }
  res.redirect(`http://localhost:5173/#/admin?key=${encodeURIComponent(req.query.key)}`);
});

app.use(cors({
  origin: 'http://localhost:5173',   // разрешаем запросы с фронтенда
  credentials: true,
}));

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  console.log(`Админка: http://localhost:${PORT}/admin?key=${ADMIN_KEY}`);
});