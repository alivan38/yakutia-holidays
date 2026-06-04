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
  HolidayEventSubmitSchema,
  HolidayQuerySchema,
  IdParamSchema,
  validateBody,
  validateParams,
  validateQuery,
} from './validators.js';

import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { resolveDirectusUrl } from './resolveDirectusUrl.js';
import { respondDirectusError } from './directusErrors.js';
import { verifyCaptchaMiddleware, warnIfProductionWithoutCaptcha } from './captcha.js';
import {
  findProposalDuplicate,
  findHolidayEventDuplicate,
  duplicateErrorMessage,
} from './duplicateCheck.js';
import { loadDirectusToken } from './loadDirectusToken.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });
dotenv.config({ path: join(__dirname, '.env') });

const app  = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;
const START_TIME = new Date();

const DIRECTUS_URL   = resolveDirectusUrl();
const DIRECTUS_TOKEN = loadDirectusToken();

if (!DIRECTUS_TOKEN) {
  console.error('❌  Нет токена Directus (.env, .directus_token или npm run dev:server)');
  process.exit(1);
}

const staticDir = [join(__dirname, 'dist'), join(__dirname, '../dist')].find((dir) =>
  existsSync(join(dir, 'index.html')),
);

const directusPublicOrigin = (process.env.PUBLIC_DIRECTUS_URL || process.env.VITE_DIRECTUS_URL || '')
  .trim()
  .replace(/\/$/, '');

const cspImgSrc = ["'self'", 'data:', 'blob:'];
if (directusPublicOrigin && /^https?:\/\//i.test(directusPublicOrigin)) {
  cspImgSrc.push(directusPublicOrigin);
}

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: staticDir
    ? {
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: cspImgSrc,
          scriptSrc: ["'self'", 'https://smartcaptcha.cloud.yandex.ru'],
          frameSrc: ["'self'", 'https://smartcaptcha.cloud.yandex.ru'],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          connectSrc: ["'self'", 'https://smartcaptcha.cloud.yandex.ru'],
        },
      }
    : false,
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(compression());

const allowedOrigins = (
  process.env.CLIENT_URL || 'http://localhost:8080,http://localhost:5173'
)
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(null, false);
  },
}));

app.use(express.json({ limit: '1mb' }));

function optionalRateLimit({ windowMs, max, message }) {
  if (!max || max <= 0) return (_req, _res, next) => next();
  return rateLimit({ windowMs, max, standardHeaders: true, legacyHeaders: false, message });
}

const isProd = process.env.NODE_ENV === 'production';
const submitLimitMax = process.env.SUBMIT_RATE_LIMIT_MAX !== undefined
  ? Number(process.env.SUBMIT_RATE_LIMIT_MAX)
  : (isProd ? 10 : 0);
const uploadLimitMax = process.env.UPLOAD_RATE_LIMIT_MAX !== undefined
  ? Number(process.env.UPLOAD_RATE_LIMIT_MAX)
  : (isProd ? 30 : 0);

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 200,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Слишком много запросов. Попробуйте через 15 минут.' },
});
const submitLimiter = optionalRateLimit({
  windowMs: 60 * 60 * 1000,
  max: submitLimitMax,
  message: { error: 'Превышен лимит отправки предложений (10 в час). Попробуйте позже.' },
});
const uploadLimiter = optionalRateLimit({
  windowMs: 60 * 60 * 1000,
  max: uploadLimitMax,
  message: { error: 'Превышен лимит загрузки файлов. Попробуйте позже.' },
});

app.use(globalLimiter);

const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/webm', 'video/quicktime',
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) return cb(null, true);
    cb(new Error(`Недопустимый тип файла: ${file.mimetype}. Разрешены: JPEG, PNG, WEBP, GIF, MP4, WEBM, MOV`));
  },
});

async function uploadFilesToDirectus(files) {
  return Promise.all(
    files.map(async (file) => {
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
}

const directusHeaders = {
  Authorization: `Bearer ${DIRECTUS_TOKEN}`,
  'Content-Type': 'application/json',
};

const PROPOSAL_IMAGE_FIELDS = 'images,images.directus_files_id.id,images.directus_files_id';
const PROPOSAL_FIELDS = `id,title,description,date,people,region,approved,${PROPOSAL_IMAGE_FIELDS}`;
const PROPOSAL_FIELDS_BASIC = 'id,title,description,date,people,region,approved,images';
const HOLIDAY_BASE_FIELDS = 'id,title,subtitle,date,description,people,region';
const HOLIDAY_IMAGE_FIELDS = 'images,images.directus_files_id.id,images.directus_files_id';
const HOLIDAY_LIST_FIELDS = `${HOLIDAY_BASE_FIELDS},${HOLIDAY_IMAGE_FIELDS}`;
const HOLIDAY_DETAIL_FIELDS = `${HOLIDAY_BASE_FIELDS},full_description,${HOLIDAY_IMAGE_FIELDS}`;
const HOLIDAY_LIST_FIELDS_BASIC = `${HOLIDAY_BASE_FIELDS},images`;
const HOLIDAY_DETAIL_FIELDS_BASIC = `${HOLIDAY_BASE_FIELDS},full_description,images`;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function extractFileId(item) {
  if (item == null) return null;
  if (typeof item === 'string') {
    const id = item.trim();
    return UUID_RE.test(id) ? id : null;
  }
  if (item.directus_files_id != null) {
    const file = item.directus_files_id;
    if (typeof file === 'string') return UUID_RE.test(file) ? file : null;
    if (file?.id && UUID_RE.test(String(file.id))) return String(file.id);
  }
  if (item.id && UUID_RE.test(String(item.id))) return String(item.id);
  return null;
}

function normalizeImageField(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw.map(extractFileId).filter(Boolean);
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (UUID_RE.test(trimmed)) return [trimmed];
    try {
      const parsed = JSON.parse(trimmed);
      return normalizeImageField(parsed);
    } catch {
      return [];
    }
  }
  const single = extractFileId(raw);
  return single ? [single] : [];
}

function mapHoliday(item) {
  if (!item) return item;
  return { ...item, images: normalizeImageField(item.images) };
}

async function fetchDirectusJson(url) {
  const r = await fetch(url, { headers: directusHeaders });
  const json = await r.json();
  return { ok: r.ok, status: r.status, ...json };
}

async function fetchHolidaysList(params) {
  params.set('fields', HOLIDAY_LIST_FIELDS);
  let json = await fetchDirectusJson(`${DIRECTUS_URL}/items/holidays?${params.toString()}`);
  if (!json.errors?.length && json.data) return json;

  if (json.errors?.length) {
    console.warn('[holidays] fallback fields without images.*:', json.errors[0]?.message);
  }
  params.set('fields', HOLIDAY_LIST_FIELDS_BASIC);
  json = await fetchDirectusJson(`${DIRECTUS_URL}/items/holidays?${params.toString()}`);
  return json;
}

async function fetchHolidayById(id) {
  let json = await fetchDirectusJson(
    `${DIRECTUS_URL}/items/holidays/${id}?fields=${HOLIDAY_DETAIL_FIELDS}`,
  );
  if ((json.ok || json.status === 404) && !json.errors?.length) return json;

  console.warn('[holidays/:id] fallback fields without images.*:', json.errors?.[0]?.message);
  return fetchDirectusJson(
    `${DIRECTUS_URL}/items/holidays/${id}?fields=${HOLIDAY_DETAIL_FIELDS_BASIC}`,
  );
}

function mapProposal(item) {
  if (!item) return item;
  const { holiday_date, ...rest } = item;
  return {
    ...rest,
    date: item.date || holiday_date || null,
    images: normalizeImageField(item.images),
  };
}

async function fetchApprovedProposals() {
  let json = await fetchDirectusJson(
    `${DIRECTUS_URL}/items/propsals?filter[approved][_eq]=true&limit=-1&fields=${PROPOSAL_FIELDS}&sort=date`,
  );
  if (!json.errors?.length && json.data) return json;

  if (json.errors?.length) {
    console.warn('[proposals/approved] fallback fields without images.*:', json.errors[0]?.message);
  }
  return fetchDirectusJson(
    `${DIRECTUS_URL}/items/propsals?filter[approved][_eq]=true&limit=-1&fields=${PROPOSAL_FIELDS_BASIC}&sort=date`,
  );
}

async function fetchProposalById(id) {
  let json = await fetchDirectusJson(
    `${DIRECTUS_URL}/items/propsals/${id}?fields=${PROPOSAL_FIELDS}`,
  );
  if ((json.ok || json.status === 404) && !json.errors?.length) return json;

  console.warn('[proposals/:id] fallback fields without images.*:', json.errors?.[0]?.message);
  return fetchDirectusJson(
    `${DIRECTUS_URL}/items/propsals/${id}?fields=${PROPOSAL_FIELDS_BASIC}`,
  );
}

function mapProposalPayload(body) {
  const payload = {
    title: body.title,
    description: body.description,
    people: body.people,
    region: body.region,
    approved: body.approved,
  };
  if (body.author_email) payload.author_email = body.author_email;
  if (body.date) payload.date = body.date;
  if (body.images?.length) {
    payload.images = body.images.map((fileId) => ({ directus_files_id: fileId }));
  }
  return payload;
}

app.get('/api/assets/:id', async (req, res) => {
  const { id } = req.params;
  const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  try {
    const r = await fetch(`${DIRECTUS_URL}/assets/${id}${query}`, {
      headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` },
    });
    if (!r.ok) return res.status(r.status).end();
    const ct = r.headers.get('content-type');
    if (ct) res.set('Content-Type', ct);
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(Buffer.from(await r.arrayBuffer()));
  } catch (err) {
    console.error('[GET /api/assets/:id]', err);
    respondDirectusError(res, err, DIRECTUS_URL, 'Ошибка загрузки файла');
  }
});

app.get('/api/health', async (_req, res) => {
  const uptimeSeconds = Math.floor((Date.now() - START_TIME.getTime()) / 1000);
  let directusStatus = 'ok';
  try {
    const r = await fetch(`${DIRECTUS_URL}/server/health`, {
      headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` },
      signal: AbortSignal.timeout(3000),
    });
    if (!r.ok) directusStatus = 'degraded';
  } catch { directusStatus = 'unreachable'; }

  const status = directusStatus === 'ok' ? 'ok' : 'degraded';
  res.status(status === 'ok' ? 200 : 503).json({
    status,
    version: process.env.npm_package_version || '1.0.0',
    uptime: uptimeSeconds,
    timestamp: new Date().toISOString(),
    services: { directus: directusStatus },
  });
});

app.get('/api/holidays', validateQuery(HolidayQuerySchema), async (req, res) => {
  const { search, month, limit, offset } = req.query;

  const params = new URLSearchParams();
  params.set('limit', limit);
  params.set('offset', offset);
  params.set('sort', 'date');
  params.set('meta', 'total_count');

  if (search) params.set('filter[title][_icontains]', search);
  if (month !== undefined) params.set('filter[date][_month][_eq]', month);

  try {
    const json = await fetchHolidaysList(params);
    if (json.errors?.length) {
      console.error('[GET /api/holidays] Directus:', json.errors);
      return res.status(502).json({ error: 'Ошибка загрузки праздников из Directus' });
    }
    const items = json.data || [];
    if (items.length === 0 && json.meta?.total_count > 0) {
      console.error('[GET /api/holidays] Directus вернул total_count без данных');
      return res.status(502).json({ error: 'Ошибка загрузки праздников из Directus' });
    }
    res.set('Cache-Control', 'public, max-age=300');
    res.json({ data: items.map(mapHoliday), meta: json.meta || {} });
  } catch (err) {
    respondDirectusError(res, err, DIRECTUS_URL, 'Ошибка загрузки праздников');
  }
});

app.get('/api/holidays/:id', validateParams(IdParamSchema), async (req, res) => {
  const { id } = req.params;
  try {
    const json = await fetchHolidayById(id);
    if (!json.ok && json.status === 404) return res.status(404).json({ error: 'Праздник не найден' });
    if (!json.data) return res.status(404).json({ error: 'Праздник не найден' });
    if (json.errors?.length) {
      console.error('[GET /api/holidays/:id] Directus:', json.errors);
      return res.status(502).json({ error: 'Ошибка загрузки праздника из Directus' });
    }
    res.set('Cache-Control', 'public, max-age=300');
    res.json(mapHoliday(json.data || null));
  } catch (err) {
    respondDirectusError(res, err, DIRECTUS_URL, 'Ошибка загрузки праздника');
  }
});

app.get('/api/holidays/:id/events', validateParams(IdParamSchema), async (req, res) => {
  const { id } = req.params;
  const params = new URLSearchParams();
  params.set('filter[holiday_id][_eq]', id);
  params.set('filter[status][_eq]', 'published');
  params.set('fields', [
    'id', 'title', 'event_date', 'description',
    'images.directus_files_id.id',
    'images.directus_files_id.filename_download',
    'images.directus_files_id.type',
    'images.directus_files_id.width',
    'images.directus_files_id.height',
  ].join(','));
  params.set('sort', '-event_date');

  try {
    const r = await fetch(`${DIRECTUS_URL}/items/holiday_events?${params.toString()}`, { headers: directusHeaders });
    if (!r.ok) return res.status(404).json({ error: 'Мероприятия не найдены' });
    const json = await r.json();
    res.set('Cache-Control', 'public, max-age=60');
    res.json(json.data || []);
  } catch (err) {
    respondDirectusError(res, err, DIRECTUS_URL, 'Ошибка загрузки мероприятий');
  }
});

app.post('/api/holidays/:id/events', submitLimiter, verifyCaptchaMiddleware, validateParams(IdParamSchema), validateBody(HolidayEventSubmitSchema), async (req, res) => {
  const { id: holidayId } = req.params;
  const { title, event_date, description, author_email, images } = req.body;

  try {
    const holidayRes = await fetch(
      `${DIRECTUS_URL}/items/holidays/${holidayId}?fields=id,title`,
      { headers: directusHeaders },
    );
    if (!holidayRes.ok) {
      return res.status(404).json({ error: 'Праздник не найден' });
    }

    const eventDup = await findHolidayEventDuplicate({
      directusUrl: DIRECTUS_URL,
      headers: directusHeaders,
      holidayId,
      title,
      eventDate: event_date,
    });
    if (eventDup) {
      return res.status(409).json({
        error: duplicateErrorMessage(eventDup),
        code: 'DUPLICATE',
        duplicate: eventDup,
      });
    }

    let eventDescription = description;
    if (author_email) {
      eventDescription = [description, '', `Email: ${author_email}`].join('\n');
    }

    const payload = {
      holiday_id: holidayId,
      title,
      event_date,
      description: eventDescription,
      status: 'draft',
    };

    if (images?.length) {
      payload.images = images.map(fileId => ({ directus_files_id: fileId }));
    }

    const r = await fetch(`${DIRECTUS_URL}/items/holiday_events`, {
      method: 'POST',
      headers: directusHeaders,
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      const lastError = await r.json();
      console.error('[POST /api/holidays/:id/events] Directus:', lastError);
      return res.status(400).json({
        error: lastError?.errors?.[0]?.message || 'Ошибка сохранения мероприятия',
      });
    }

    const created = await r.json();
    res.status(201).json(created.data ?? {});
  } catch (err) {
    console.error('[POST /api/holidays/:id/events]', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.get('/api/proposals/approved', async (_req, res) => {
  try {
    const json = await fetchApprovedProposals();
    if (json.errors?.length) {
      console.error('[GET /api/proposals/approved] Directus:', json.errors);
      return res.status(502).json({ error: 'Ошибка загрузки предложений из Directus' });
    }
    res.json((json.data || []).map(mapProposal));
  } catch (err) {
    respondDirectusError(res, err, DIRECTUS_URL, 'Ошибка загрузки предложений');
  }
});

app.get('/api/proposals/:id', validateParams(IdParamSchema), async (req, res) => {
  const { id } = req.params;
  try {
    const json = await fetchProposalById(id);
    if (!json.ok && json.status === 404) return res.status(404).json({ error: 'Предложение не найдено' });
    if (json.errors?.length) {
      console.error('[GET /api/proposals/:id] Directus:', json.errors);
      return res.status(502).json({ error: 'Ошибка загрузки предложения из Directus' });
    }
    res.json(mapProposal(json.data || null));
  } catch (err) {
    respondDirectusError(res, err, DIRECTUS_URL, 'Ошибка загрузки');
  }
});

app.post('/api/proposals/upload', uploadLimiter, upload.array('files', 10), async (req, res) => {
  if (!req.files || req.files.length === 0)
    return res.status(400).json({ error: 'Файлы не переданы' });
  try {
    const ids = (await uploadFilesToDirectus(req.files)).filter(Boolean);
    res.json({ ids });
  } catch (err) {
    console.error('[POST /api/proposals/upload]', err);
    res.status(500).json({ error: 'Ошибка загрузки файлов' });
  }
});

app.post('/api/holiday-events/upload', uploadLimiter, upload.array('files', 10), async (req, res) => {
  if (!req.files || req.files.length === 0)
    return res.status(400).json({ error: 'Файлы не переданы' });
  try {
    const ids = (await uploadFilesToDirectus(req.files)).filter(Boolean);
    res.json({ ids });
  } catch (err) {
    console.error('[POST /api/holiday-events/upload]', err);
    res.status(500).json({ error: 'Ошибка загрузки файлов' });
  }
});

app.post('/api/proposals', submitLimiter, verifyCaptchaMiddleware, validateBody(ProposalSchema), async (req, res) => {
  const { author_email, ...safeLog } = req.body;
  console.log('[POST /api/proposals] payload:', safeLog);
  try {
    const proposalDup = await findProposalDuplicate({
      directusUrl: DIRECTUS_URL,
      headers: directusHeaders,
      title: req.body.title,
      date: req.body.date,
      people: req.body.people,
    });
    if (proposalDup) {
      return res.status(409).json({
        error: duplicateErrorMessage(proposalDup),
        code: 'DUPLICATE',
        duplicate: proposalDup,
      });
    }

    const r = await fetch(`${DIRECTUS_URL}/items/propsals`, {
      method: 'POST',
      headers: directusHeaders,
      body: JSON.stringify(mapProposalPayload(req.body)),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      console.error('[POST /api/proposals] Directus:', err?.errors ?? err);
      return res.status(400).json({ error: err?.errors?.[0]?.message || 'Ошибка сохранения' });
    }
    const json = await r.json();
    const { author_email: _omit, ...publicData } = json.data ?? {};
    res.status(201).json(publicData);
  } catch (err) {
    respondDirectusError(res, err, DIRECTUS_URL, 'Ошибка сервера');
  }
});

function attachStaticSite() {
  if (process.env.SERVE_STATIC === 'false' || !staticDir) return;

  app.use('/assets', express.static(join(staticDir, 'assets'), { maxAge: '7d' }));
  app.get('/favicon.svg', (_req, res, next) => {
    const file = join(staticDir, 'favicon.svg');
    if (!existsSync(file)) return next();
    res.sendFile(file);
  });

  // SPA: /contribute, /calendar и т.д. — отдаём index.html (React Router на клиенте)
  app.get('*', (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (req.path.startsWith('/api')) return next();
    res.sendFile(join(staticDir, 'index.html'), (err) => {
      if (err) next(err);
    });
  });
}

attachStaticSite();

app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    const messages = {
      LIMIT_FILE_SIZE: 'Файл слишком большой. Максимум 10 МБ',
      LIMIT_FILE_COUNT: 'Максимум 10 файлов за раз',
      LIMIT_UNEXPECTED_FILE: 'Неожиданное поле файла',
    };
    return res.status(400).json({ error: messages[err.code] || `Ошибка загрузки файла: ${err.message}` });
  }
  if (err) {
    console.error('[unhandled error]', err.message);
    return res.status(400).json({ error: err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  warnIfProductionWithoutCaptcha();
  console.log(`✅  Сервер запущен на http://0.0.0.0:${PORT}`);
  console.log(`   Directus: ${DIRECTUS_URL}`);
  if (staticDir) console.log('   Сайт:     / (index.html из dist/)');
});
