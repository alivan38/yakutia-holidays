const express = require('express');
const pool = require('../db');

const router = express.Router();

// Получить все предложения
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM proposals ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Отправить новое предложение
router.post('/', async (req, res) => {
  const { title, people, description, region } = req.body;
  if (!title || !people || !description) {
    return res.status(400).json({ error: 'Заполните обязательные поля' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO proposals (title, people, description, region) VALUES ($1, $2, $3, $4) RETURNING id',
      [title, people, description, region]
    );
    res.status(201).json({ id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;