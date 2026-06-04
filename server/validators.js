import { z } from 'zod';

const trimmedString = (label) =>
  z.string({ required_error: `${label} обязательно` }).trim();

const optionalTrimmedString = (label, minLen, maxLen) =>
  z.preprocess(
    (val) => (val == null || String(val).trim() === '' ? undefined : val),
    trimmedString(label).min(minLen).max(maxLen).optional(),
  );

function isValidIsoDateYmd(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day
  );
}

const ymdDateField = (dateMessage = 'Дата должна быть в формате YYYY-MM-DD') =>
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, dateMessage)
    .refine((d) => isValidIsoDateYmd(d), 'Недействительная дата')
    .refine((d) => {
      const year = parseInt(d.split('-')[0], 10);
      return year >= 1900 && year <= 2060;
    }, 'Год должен быть от 1900 до 2060');

const emailField = z
  .string({ required_error: 'Некорректный формат email' })
  .trim()
  .toLowerCase()
  .min(1, 'Email не может быть пустым')
  .max(254, 'Email слишком длинный (максимум 254 символа)')
  .email('Некорректный формат email')
  .refine(
    (v) => /^[^@]+@[^@]+\.[^@]+$/.test(v),
    'Email должен содержать домен с точкой (например, user@example.com)',
  )
  .refine(
    (v) => {
      const disposableDomains = [
        'mailinator.com', 'guerrillamail.com', 'tempmail.com',
        'throwaway.email', 'yopmail.com', 'sharklasers.com',
        'guerrillamailblock.com', 'grr.la', 'spam4.me',
      ];
      const domain = v.split('@')[1] ?? '';
      return !disposableDomains.includes(domain);
    },
    'Одноразовые email-адреса не принимаются',
  );

const optionalEmailField = z.preprocess(
  (val) => (val == null || String(val).trim() === '' ? undefined : val),
  emailField.optional(),
);

export const IdParamSchema = z.object({
  id: z
    .string()
    .min(1, 'ID не может быть пустым')
    .max(100, 'ID слишком длинный')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'ID может содержать только буквы, цифры, дефисы и подчёркивания',
    ),
});

export const ProposalSchema = z.object({
  title: trimmedString('Название')
    .min(3, 'Название должно содержать не менее 3 символов')
    .max(200, 'Название не должно превышать 200 символов'),

  description: trimmedString('Описание')
    .min(10, 'Описание должно содержать не менее 10 символов')
    .max(5000, 'Описание не должно превышать 5000 символов'),

  author_email: optionalEmailField,

  people: optionalTrimmedString('Народ', 2, 100),
  region: optionalTrimmedString('Регион', 2, 200),
  approved: z.boolean().optional().default(false),

  date: ymdDateField('Дата должна быть в формате YYYY-MM-DD').optional(),

  images: z
    .array(z.string().uuid('Некорректный UUID изображения'))
    .max(10, 'Максимум 10 изображений')
    .optional()
    .default([]),
});

export const HolidayEventSubmitSchema = z.object({
  title: trimmedString('Название')
    .min(2, 'Название должно содержать не менее 2 символов')
    .max(200, 'Название не должно превышать 200 символов'),

  event_date: ymdDateField('Дата должна быть в формате ГГГГ-ММ-ДД'),

  description: trimmedString('Описание')
    .min(10, 'Описание должно содержать не менее 10 символов')
    .max(5000, 'Описание не должно превышать 5000 символов'),

  author_email: optionalEmailField,

  images: z
    .array(z.string().uuid('Некорректный UUID файла'))
    .max(10, 'Максимум 10 файлов')
    .optional()
    .default([]),
});

export const HolidayQuerySchema = z.object({
  search: z
    .string()
    .trim()
    .max(100, 'Строка поиска не должна превышать 100 символов')
    .optional(),

  month: z
    .string()
    .regex(/^(0?[1-9]|1[0-2])$/, 'Месяц должен быть от 1 до 12')
    .transform(Number)
    .optional(),

  limit: z
    .string()
    .regex(/^\d+$/, 'Лимит должен быть числом')
    .transform(Number)
    .refine((n) => n >= 1 && n <= 200, 'Лимит должен быть от 1 до 200')
    .optional()
    .default('50'),

  offset: z
    .string()
    .regex(/^\d+$/, 'Смещение должно быть числом')
    .transform(Number)
    .refine((n) => n >= 0, 'Смещение должно быть неотрицательным')
    .optional()
    .default('0'),
});

export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field: e.path.join('.') || 'root',
        message: e.message,
      }));
      return res.status(400).json({
        error: 'Ошибка валидации',
        details: errors,
      });
    }
    req.body = result.data;
    next();
  };
}

export function validateParams(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return res.status(400).json({
        error: 'Некорректные параметры запроса',
        details: errors,
      });
    }
    req.params = result.data;
    next();
  };
}

export function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return res.status(400).json({
        error: 'Некорректные параметры фильтрации',
        details: errors,
      });
    }
    req.query = result.data;
    next();
  };
}
