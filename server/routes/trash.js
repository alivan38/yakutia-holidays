const express = require('express');
const pool = require('../db');

const router = express.Router();

// Получить элементы корзины (только не просроченные)
router.get('/', async (req, res) => {
  try {
    // Удаляем просроченные (старше 7 дней)
    await pool.query(
      "DELETE FROM trash_proposals WHERE deleted_at < NOW() - INTERVAL '7 days'"
    );

    const result = await pool.query(
      'SELECT * FROM trash_proposals ORDER BY deleted_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Восстановить элемент из корзины обратно в proposals
router.post('/restore/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Получаем запись из корзины
    const trashResult = await pool.query(
      'SELECT * FROM trash_proposals WHERE id = $1',
      [id]
    );
    if (trashResult.rows.length === 0) {
      return res.status(404).json({ error: 'Запись не найдена' });
    }
    const item = trashResult.rows[0];

    // Вставляем обратно в proposals
    await pool.query(
      'INSERT INTO proposals (title, people, description, region, approved) VALUES ($1, $2, $3, $4, $5)',
      [item.title, item.people, item.description, item.region, item.approved]
    );

    // Удаляем из корзины
    await pool.query('DELETE FROM trash_proposals WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Удалить выборочно из корзины
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM trash_proposals WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Очистить всю корзину
router.delete('/clear/all', async (req, res) => {
  try {
    await pool.query('DELETE FROM trash_proposals');
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;