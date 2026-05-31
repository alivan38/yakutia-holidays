import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fetch from 'node-fetch';
import FormData from 'form-data';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

import {
  ProposalSchema,
  HolidayQuerySchema,
  IdParamSchema,
  validateBody,
  validateParams,
  validateQuery,
} from './validators.js';

dotenv.config();

const app  = express();
const PORT = process.env.PORT || 5000;

const DIRECTUS_URL   = process.env.DIRECTUS_URL   || 'http://localhost:8055';
const DIRECTUS_TOKEN = process.env.DIRECTUS_TOKEN;

if (!DIRECTUS_TOKEN) {
  console.error('❌  DIRECTUS_TOKEN не задан в .env — сервер не запущен');
  process.exit(1);
}

/* ── CORS ── */
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));

/* ── Rate limiting ── */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Слишком много запросов. Попробуйте через 15 минут.' },
});

const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 час
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Превышен лимит отправки предложений (10 в час). Попробуйте позже.' },
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 час
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Превышен лимит загрузки файлов. Попробуйте позже.' },
});

app.use(globalLimiter);

/* ── Multer: загрузка файлов ── */
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 МБ
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Недопустимый тип файла: ${file.mimetype}. ` +
          `Разрешены: JPEG, PNG, WEBP, GIF, PDF`,
        ),
      );
    }
  },
});

const directusHeaders = {
  Authorization: `Bearer ${DIRECTUS_TOKEN}`,
  'Content-Type': 'application/json',
};

/* ════════════════════════════════════════
   GET /api/holidays
   Query: ?search=...&month=1-12&limit=1-200&offset=0
════════════════════════════════════════ */
app.get('/api/holidays', validateQuery(HolidayQuerySchema), async (req, res) => {
  const { search, month, limit, offset } = req.query;

  const params = new URLSearchParams();
  params.set('limit', limit);
  params.set('offset', offset);

  if (search) {
    params.set('filter[title][_icontains]', search);
  }
  if (month !== undefined) {
    params.set('filter[month][_eq]', month);
  }

  try {
    const r = await fetch(
      `${DIRECTUS_URL}/items/holidays?${params.toString()}`,
      { headers: directusHeaders },
    );
    const json = await r.json();
    res.json(json.data || []);
  } catch {
    res.status(500).json({ error: 'Ошибка загрузки праздников' });
  }
});

/* ════════════════════════════════════════
   GET /api/holidays/:id
════════════════════════════════════════ */
app.get(
  '/api/holidays/:id',
  validateParams(IdParamSchema),
  async (req, res) => {
    const { id } = req.params;
    try {
      const r = await fetch(
        `${DIRECTUS_URL}/items/holidays/${id}`,
        { headers: directusHeaders },
      );
      if (!r.ok) return res.status(404).json({ error: 'Праздник не найден' });
      const json = await r.json();
      res.json(json.data || null);
    } catch {
      res.status(500).json({ error: 'Ошибка загрузки праздника' });
    }
  },
);

/* ════════════════════════════════════════
   GET /api/proposals/approved
════════════════════════════════════════ */
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

/* ════════════════════════════════════════
   GET /api/proposals/:id
════════════════════════════════════════ */
app.get(
  '/api/proposals/:id',
  validateParams(IdParamSchema),
  async (req, res) => {
    const { id } = req.params;
    try {
      const r = await fetch(
        `${DIRECTUS_URL}/items/propsals/${id}`,
        { headers: directusHeaders },
      );
      if (!r.ok) return res.status(404).json({ error: 'Предложение не найдено' });
      const json = await r.json();
      res.json(json.data || null);
    } catch {
      res.status(500).json({ error: 'Ошибка загрузки' });
    }
  },
);

/* ════════════════════════════════════════
   POST /api/proposals/upload — загрузка файлов
════════════════════════════════════════ */
app.post(
  '/api/proposals/upload',
  uploadLimiter,
  upload.array('files', 10),
  async (req, res) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Файлы не переданы' });
    }
    try {
      const ids = await Promise.all(
        req.files.map(async (file) => {
          const form = new FormData();
          form.append('file', file.buffer, {
            filename: file.originalname,
            contentType: file.mimetype,
          });
          const r = await fetch(`${DIRECTUS_URL}/files`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${DIRECTUS_TOKEN}`,
              ...form.getHeaders(),
            },
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
  },
);

/* ════════════════════════════════════════
   POST /api/proposals — создать предложение
════════════════════════════════════════ */
app.post(
  '/api/proposals',
  submitLimiter,
  validateBody(ProposalSchema),
  async (req, res) => {
    try {
      const r = await fetch(`${DIRECTUS_URL}/items/propsals`, {
        method: 'POST',
        headers: directusHeaders,
        body: JSON.stringify(req.body),
      });
      if (!r.ok) {
        const err = await r.json();
        return res
          .status(400)
          .json({ error: err?.errors?.[0]?.message || 'Ошибка сохранения' });
      }
      const json = await r.json();
      res.status(201).json(json.data);
    } catch {
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  },
);

/* ════════════════════════════════════════
   Глобальный обработчик ошибок (Multer + остальные)
════════════════════════════════════════ */
app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    const messages = {
      LIMIT_FILE_SIZE: 'Файл слишком большой. Максимум 10 МБ',
      LIMIT_FILE_COUNT: 'Максимум 10 файлов за раз',
      LIMIT_UNEXPECTED_FILE: 'Неожиданное поле файла',
    };
    return res
      .status(400)
      .json({ error: messages[err.code] || `Ошибка загрузки файла: ${err.message}` });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
});

app.listen(PORT, () =>
  console.log(`✅  Сервер запущен на http://localhost:${PORT}`),
);
