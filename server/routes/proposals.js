const express = require('express');
const pool = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

const router = express.Router();
const ADMIN_KEY = process.env.ADMIN_KEY || 'sp123';

// Защита по ключу для админских маршрутов
function requireAdminKey(req, res, next) {
  if (req.query.key !== ADMIN_KEY) {
    return res.status(403).json({ error: 'Неверный ключ' });
  }
  next();
}

// ---------- Multer ----------
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) return cb(null, true);
    cb(new Error('Разрешены только изображения (jpg, png, webp, gif)'));
  },
}).array('images', 5);

// ---------- ПУБЛИЧНЫЕ МАРШРУТЫ ----------

// Все предложения
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM proposals ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Только одобренные
router.get('/approved', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM proposals WHERE approved = true ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Одно предложение по ID (публичный)
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM proposals WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Не найдено' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ---------- ПУБЛИЧНЫЙ POST (предложение с фото) ----------
router.post('/', (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      if (req.files) {
        await Promise.all(req.files.map(f => fs.unlink(path.join(__dirname, '..', 'uploads', f.filename)).catch(() => {})));
      }
      return res.status(400).json({ error: err.message });
    }

    const { title, people, description, region } = req.body;
    if (!title || !people || !description) {
      if (req.files) {
        await Promise.all(req.files.map(f => fs.unlink(path.join(__dirname, '..', 'uploads', f.filename)).catch(() => {})));
      }
      return res.status(400).json({ error: 'Заполните обязательные поля' });
    }

    const imagePaths = req.files ? req.files.map(f => `"/uploads/${f.filename}"`) : [];
    const imagesLiteral = `{${imagePaths.join(',')}}`;

    try {
      const result = await pool.query(
        `INSERT INTO proposals (title, people, description, region, images)
         VALUES ($1, $2, $3, $4, $5::text[])
         RETURNING id`,
        [title, people, description, region, imagesLiteral]
      );
      res.status(201).json({ id: result.rows[0].id });
    } catch (dbErr) {
      console.error(dbErr);
      if (req.files) {
        await Promise.all(req.files.map(f => fs.unlink(path.join(__dirname, '..', 'uploads', f.filename)).catch(() => {})));
      }
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  });
});

// ---------- АДМИНСКИЕ МАРШРУТЫ (требуют ключ) ----------

// Загрузка фото (админ)
router.post('/upload', requireAdminKey, (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    const paths = req.files ? req.files.map(f => `/uploads/${f.filename}`) : [];
    res.json({ images: paths });
  });
});

// Удалить предложение (перенос в корзину)
router.delete('/:id', requireAdminKey, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM proposals WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Запись не найдена' });
    const item = result.rows[0];

    const trashCount = await pool.query('SELECT COUNT(*) FROM trash_proposals');
    if (parseInt(trashCount.rows[0].count, 10) >= 7) {
      await pool.query(
        'DELETE FROM trash_proposals WHERE id = (SELECT id FROM trash_proposals ORDER BY deleted_at ASC LIMIT 1)'
      );
    }

    const imagesLiteral = item.images
      ? (Array.isArray(item.images) ? `{${item.images.map(p => `"${p}"`).join(',')}}` : item.images)
      : '{}';

    await pool.query(
      `INSERT INTO trash_proposals (original_id, title, people, description, region, approved, images, deleted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7::text[], NOW())`,
      [item.id, item.title, item.people, item.description, item.region, item.approved, imagesLiteral]
    );

    await pool.query('DELETE FROM proposals WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Переключить статус одобрения
router.put('/:id/approve', requireAdminKey, async (req, res) => {
  const { id } = req.params;
  const { approved } = req.body;
  try {
    await pool.query('UPDATE proposals SET approved = $1 WHERE id = $2', [approved, id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Обновить предложение (текст + изображения) – админ
router.put('/:id', requireAdminKey, async (req, res) => {
  const { id } = req.params;
  const { title, people, description, region, images } = req.body;
  if (!title || !people || !description) return res.status(400).json({ error: 'Заполните обязательные поля' });

  try {
    // Если изображения не переданы, оставляем старые
    if (!images) {
      await pool.query(
        'UPDATE proposals SET title=$1, people=$2, description=$3, region=$4 WHERE id=$5',
        [title, people, description, region, id]
      );
      return res.json({ success: true });
    }

    // Преобразуем массив в строку литерала PostgreSQL
    const arr = Array.isArray(images) ? images : JSON.parse(images);
    const imagesLiteral = `{${arr.map(p => `"${p}"`).join(',')}}`;

    await pool.query(
      `UPDATE proposals SET title=$1, people=$2, description=$3, region=$4, images=$5::text[] WHERE id=$6`,
      [title, people, description, region, imagesLiteral, id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;