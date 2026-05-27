import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fetch from 'node-fetch';
import FormData from 'form-data';
import dotenv from 'dotenv';

dotenv.config();

const app  = express();
const PORT = process.env.PORT || 5000;

const DIRECTUS_URL   = process.env.DIRECTUS_URL   || 'http://localhost:8055';
const DIRECTUS_TOKEN = process.env.DIRECTUS_TOKEN;

if (!DIRECTUS_TOKEN) {
  console.error('❌  DIRECTUS_TOKEN не задан в .env — сервер не запущен');
  process.exit(1);
}

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const directusHeaders = {
  Authorization: `Bearer ${DIRECTUS_TOKEN}`,
  'Content-Type': 'application/json',
};

/* ── GET /api/holidays ── */
app.get('/api/holidays', async (req, res) => {
  try {
    const r = await fetch(`${DIRECTUS_URL}/items/holidays?limit=-1`, { headers: directusHeaders });
    const json = await r.json();
    res.json(json.data || []);
  } catch {
    res.status(500).json({ error: 'Ошибка загрузки праздников' });
  }
});

/* ── GET /api/holidays/:id ── */
app.get('/api/holidays/:id', async (req, res) => {
  try {
    const r = await fetch(`${DIRECTUS_URL}/items/holidays/${req.params.id}`, { headers: directusHeaders });
    if (!r.ok) return res.status(404).json({ error: 'Не найдено' });
    const json = await r.json();
    res.json(json.data || null);
  } catch {
    res.status(500).json({ error: 'Ошибка загрузки праздника' });
  }
});

/* ── GET /api/proposals/approved ── */
app.get('/api/proposals/approved', async (req, res) => {
  try {
    const r = await fetch(
      `${DIRECTUS_URL}/items/propsals?filter[approved][_eq]=true&limit=-1`,
      { headers: directusHeaders },
    );
    const json = await r.json();
    res.json(json.data || []);
  } catch {
    res.status(500).json({ error: 'Ошибка загрузки предложений' });
  }
});

/* ── GET /api/proposals/:id ── */
app.get('/api/proposals/:id', async (req, res) => {
  try {
    const r = await fetch(`${DIRECTUS_URL}/items/propsals/${req.params.id}`, { headers: directusHeaders });
    if (!r.ok) return res.status(404).json({ error: 'Не найдено' });
    const json = await r.json();
    res.json(json.data || null);
  } catch {
    res.status(500).json({ error: 'Ошибка загрузки' });
  }
});

/* ── POST /api/proposals/upload — загрузка файлов ── */
app.post('/api/proposals/upload', upload.array('files', 10), async (req, res) => {
  try {
    const ids = await Promise.all(
      req.files.map(async (file) => {
        const form = new FormData();
        form.append('file', file.buffer, { filename: file.originalname, contentType: file.mimetype });
        const r = await fetch(`${DIRECTUS_URL}/files`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}`, ...form.getHeaders() },
          body: form,
        });
        const json = await r.json();
        return json?.data?.id ?? null;
      }),
    );
    res.json({ ids: ids.filter(Boolean) });
  } catch {
    res.status(500).json({ error: 'Ошибка загрузки файлов' });
  }
});

/* ── POST /api/proposals — создать предложение ── */
app.post('/api/proposals', async (req, res) => {
  try {
    const r = await fetch(`${DIRECTUS_URL}/items/propsals`, {
      method: 'POST',
      headers: directusHeaders,
      body: JSON.stringify(req.body),
    });
    if (!r.ok) {
      const err = await r.json();
      return res.status(400).json({ error: err?.errors?.[0]?.message || 'Ошибка сохранения' });
    }
    const json = await r.json();
    res.status(201).json(json.data);
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.listen(PORT, () => console.log(`✅  Сервер запущен на http://localhost:${PORT}`));
