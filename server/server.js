import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fetch from 'node-fetch';
import FormData from 'form-data';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';

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
const START_TIME = new Date();

const DIRECTUS_URL   = process.env.DIRECTUS_URL   || 'http://localhost:8055';
const DIRECTUS_TOKEN = process.env.DIRECTUS_TOKEN;

if (!DIRECTUS_TOKEN) {
  console.error('❌  DIRECTUS_TOKEN не задан в .env — сервер не запущен');
  process.exit(1);
}

/* ── Security headers ── */
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

/* ── HTTP access log ── */
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

/* ── Gzip-сжатие ответов ── */
app.use(compression());

/* ── CORS ── */
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',').map(o => o.trim());

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} не разрешён`));
  },
}));

app.use(express.json({ limit: '1mb' }));

/* ── Rate limiting ── */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Слишком много запросов. Попробуйте через 15 минут.' },
});

const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Превышен лимит отправки предложений (10 в час). Попробуйте позже.' },
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
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
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(
        `Недопустимый тип файла: ${file.mimetype}. Разрешены: JPEG, PNG, WEBP, GIF, PDF`,
      ));
    }
  },
});

const directusHeaders = {
  Authorization: `Bearer ${DIRECTUS_TOKEN}`,
  'Content-Type': 'application/json',
};

/* ════════════════════════════════════════
   GET /api/health
════════════════════════════════════════ */
app.get('/api/health', async (_req, res) => {
  const uptimeSeconds = Math.floor((Date.now() - START_TIME.getTime()) / 1000);

  let directusStatus = 'ok';
  try {
    const r = await fetch(`${DIRECTUS_URL}/server/health`, {
      headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` },
      signal: AbortSignal.timeout(3000),
    });
    if (!r.ok) directusStatus = 'degraded';
  } catch {
    directusStatus = 'unreachable';
  }

  const status = directusStatus === 'ok' ? 'ok' : 'degraded';

  res.status(status === 'ok' ? 200 : 503).json({
    status,
    version: process.env.npm_package_version || '1.0.0',
    uptime: uptimeSeconds,
    timestamp: new Date().toISOString(),
    services: { directus: directusStatus },
  });
});

/* ════════════════════════════════════════
   GET /api/holidays
════════════════════════════════════════ */
app.get('/api/holidays', validateQuery(HolidayQuerySchema), async (req, res) => {
  const { search, month, limit, offset } = req.query;

  const params = new URLSearchParams();
  params.set('limit', limit);
  params.set('offset', offset);
  params.set('fields', 'id,title,date,description,month');
  params.set('sort', 'month,date');
  params.set('meta', 'total_count');

  if (search) params.set('filter[title][_icontains]', search);
  if (month !== undefined) params.set('filter[month][_eq]', month);

  try {
    const r = await fetch(
      `${DIRECTUS_URL}/items/holidays?${params.toString()}`,
      { headers: directusHeaders },
    );
    const json = await r.json();

    res.set('Cache-Control', 'public, max-age=300');
    res.json({
      data: json.data || [],
      meta: json.meta || {},
    });
  } catch (err) {
    console.error('[GET /api/holidays]', err);
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
        `${DIRECTUS_URL}/items/holidays/${id}?fields=id,title,date,description,month`,
        { headers: directusHeaders },
      );
      if (!r.ok) return res.status(404).json({ error: 'Праздник не найден' });
      const json = await r.json();

      res.set('Cache-Control', 'public, max-age=300');
      res.json(json.data || null);
    } catch (err) {
      console.error('[GET /api/holidays/:id]', err);
      res.status(500).json({ error: 'Ошибка загрузки праздника' });
    }
  },
);

/* ════════════════════════════════════════
   GET /api/holidays/:id/events
   Возвращает прошедшие мероприятия для праздника,
   включая фото/видео через M2M-связь images.
════════════════════════════════════════ */
app.get(
  '/api/holidays/:id/events',
  validateParams(IdParamSchema),
  async (req, res) => {
    const { id } = req.params;
    const params = new URLSearchParams();
    params.set('filter[holiday_id][_eq]', id);
    params.set('filter[status][_eq]', 'published');
    params.set('fields', [
      'id',
      'title',
      'event_date',
      'description',
      'images.directus_files_id.id',
      'images.directus_files_id.filename_download',
      'images.directus_files_id.type',
      'images.directus_files_id.width',
      'images.directus_files_id.height',
    ].join(','));
    params.set('sort', '-event_date'); // новые первыми

    try {
      const r = await fetch(
        `${DIRECTUS_URL}/items/holiday_events?${params.toString()}`,
        { headers: directusHeaders },
      );
      if (!r.ok) return res.status(404).json({ error: 'Мероприятия не найдены' });
      const json = await r.json();

      res.set('Cache-Control', 'public, max-age=60');
      res.json(json.data || []);
    } catch (err) {
      console.error('[GET /api/holidays/:id/events]', err);
      res.status(500).json({ error: 'Ошибка загрузки мероприятий' });
    }
  },
);

/* ════════════════════════════════════════
   GET /api/proposals/approved
════════════════════════════════════════ */
app.get('/api/proposals/approved', async (_req, res) => {
  try {
    const r = await fetch(
      `${DIRECTUS_URL}/items/propsals?filter[approved][_eq]=true&limit=-1&fields=id,title,description,date,approved&sort=date`,
      { headers: directusHeaders },
    );
    const json = await r.json();
    res.json(json.data || []);
  } catch (err) {
    console.error('[GET /api/proposals/approved]', err);
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
        `${DIRECTUS_URL}/items/propsals/${id}?fields=id,title,description,date,approved`,
        { headers: directusHeaders },
      );
      if (!r.ok) return res.status(404).json({ error: 'Предложение не найдено' });
      const json = await r.json();
      res.json(json.data || null);
    } catch (err) {
      console.error('[GET /api/proposals/:id]', err);
      res.status(500).json({ error: 'Ошибка загрузки' });
    }
  },
);

/* ════════════════════════════════════════
   POST /api/proposals/upload
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
            headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}`, ...form.getHeaders() },
            body: form,
          });
          const json = await r.json();
          return json?.data?.id ?? null;
        }),
      );
      res.json({ ids: ids.filter(Boolean) });
    } catch (err) {
      console.error('[POST /api/proposals/upload]', err);
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
    const { author_email, ...safeLog } = req.body;
    console.log('[POST /api/proposals] payload:', safeLog);

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

      const { author_email: _omit, ...publicData } = json.data ?? {};
      res.status(201).json(publicData);
    } catch (err) {
      console.error('[POST /api/proposals] server error');
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  },
);

/* ════════════════════════════════════════
   Глобальный обработчик ошибок
════════════════════════════════════════ */
app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    const messages = {
      LIMIT_FILE_SIZE:       'Файл слишком большой. Максимум 10 МБ',
      LIMIT_FILE_COUNT:      'Максимум 10 файлов за раз',
      LIMIT_UNEXPECTED_FILE: 'Неожиданное поле файла',
    };
    return res.status(400).json({
      error: messages[err.code] || `Ошибка загрузки файла: ${err.message}`,
    });
  }
  if (err) {
    console.error('[unhandled error]', err.message);
    return res.status(400).json({ error: err.message });
  }
});

app.listen(PORT, () =>
  console.log(`✅  Сервер запущен на http://localhost:${PORT}`),
);
