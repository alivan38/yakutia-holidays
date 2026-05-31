import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fetch from 'node-fetch';
import FormData from 'form-data';
import dotenv from 'dotenv';
import { z } from 'zod';

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

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Недопустимый тип файла: ${file.mimetype}. Разрешены: JPEG, PNG, WEBP, GIF, PDF`));
    }
  },
});

const directusHeaders = {
  Authorization: `Bearer ${DIRECTUS_TOKEN}`,
  'Content-Type': 'application/json',
};

/* ── Zod-схемы ── */

const ProposalSchema = z.object({
  title: z
    .string({ required_error: 'Название обязательно' })
    .trim()
    .min(3, 'Название должно быть не менее 3 символов')
    .max(200, 'Название не должно превышать 200 символов'),

  description: z
    .string({ required_error: 'Описание обязательно' })
    .trim()
    .min(10, 'Описание должно быть не менее 10 символов')
    .max(5000, 'Описание не должно превышать 5000 символов'),

  author_name: z
    .string({ required_error: 'Имя автора обязательно' })
    .trim()
    .min(2, 'Имя автора должно быть не менее 2 символов')
    .max(100, 'Имя автора не должно превышать 100 символов'),

  author_email: z
    .string()
    .email('Некорректный формат email')
    .max(200, 'Email слишком длинный')
    .optional()
    .or(z.literal('')),

  holiday_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Дата должна быть в формате YYYY-MM-DD')
    .optional(),

  images: z
    .array(z.string().uuid('Некорректный ID изображения'))
    .max(10, 'Максимум 10 изображений')
    .optional(),
});

/* ── Middleware: валидация через Zod ── */
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return res.status(400).json({ error: 'Ошибка валидации', details: errors });
    }
    req.body = result.data; // записываем очищенные данные
    next();
  };
}

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
  const id = parseInt(req.params.id, 10);
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'Некорректный ID праздника' });
  }
  try {
    const r = await fetch(`${DIRECTUS_URL}/items/holidays/${id}`, { headers: directusHeaders });
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
  const id = parseInt(req.params.id, 10);
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'Некорректный ID предложения' });
  }
  try {
    const r = await fetch(`${DIRECTUS_URL}/items/propsals/${id}`, { headers: directusHeaders });
    if (!r.ok) return res.status(404).json({ error: 'Не найдено' });
    const json = await r.json();
    res.json(json.data || null);
  } catch {
    res.status(500).json({ error: 'Ошибка загрузки' });
  }
});

/* ── POST /api/proposals/upload — загрузка файлов ── */
app.post('/api/proposals/upload', upload.array('files', 10), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'Файлы не переданы' });
  }
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
app.post('/api/proposals', validate(ProposalSchema), async (req, res) => {
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

/* ── Глобальный обработчик ошибок Multer ── */
app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Файл слишком большой. Максимум 10 МБ' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Максимум 10 файлов за раз' });
    }
    return res.status(400).json({ error: `Ошибка загрузки файла: ${err.message}` });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`✅  Сервер запущен на http://localhost:${PORT}`));
