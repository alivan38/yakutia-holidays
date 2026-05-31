import { z } from 'zod';

/* ─────────────────────────────────────────
   Вспомогательные типы
───────────────────────────────────────── */

// Строка: обрезаем пробелы, не принимаем только пробелы
const trimmedString = (label) =>
  z.string({ required_error: `${label} обязательно` }).trim();

// Нормализация email: trim + lowercase + валидация
const emailField = z
  .string({ required_error: 'Email автора обязателен' })
  .trim()
  .toLowerCase()
  .min(1, 'Email не может быть пустым')
  .max(254, 'Email слишком длинный (максимум 254 символа)')   // RFC 5321 limit
  .email('Некорректный формат email')
  // Дополнительная проверка: домен должен содержать хотя бы одну точку
  .refine(
    (v) => /^[^@]+@[^@]+\.[^@]+$/.test(v),
    'Email должен содержать домен с точкой (например, user@example.com)',
  )
  // Блокируем одноразовые/временные сервисы
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

// Slug или числовой ID в URL-параметре
// Принимает: числа (1, 42) и строковые slug-и (ysyakh, olonkho-day, proposal-5)
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

/* ─────────────────────────────────────────
   Схема предложения (POST /api/proposals)
───────────────────────────────────────── */
export const ProposalSchema = z.object({
  title: trimmedString('Название')
    .min(3, 'Название должно содержать не менее 3 символов')
    .max(200, 'Название не должно превышать 200 символов'),

  description: trimmedString('Описание')
    .min(10, 'Описание должно содержать не менее 10 символов')
    .max(5000, 'Описание не должно превышать 5000 символов'),

  author_name: trimmedString('Имя автора')
    .min(2, 'Имя должно содержать не менее 2 символов')
    .max(100, 'Имя не должно превышать 100 символов')
    // Только буквы (включая кириллицу), пробелы и дефисы
    .regex(
      /^[\p{L}\s'-]+$/u,
      'Имя может содержать только буквы, пробелы и дефисы',
    ),

  // ── author_email: теперь обязательное поле ──
  author_email: emailField,

  holiday_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Дата должна быть в формате YYYY-MM-DD')
    .refine((d) => {
      const date = new Date(d);
      return !isNaN(date.getTime());
    }, 'Недействительная дата')
    .refine((d) => {
      const year = parseInt(d.split('-')[0], 10);
      return year >= 1900 && year <= 2060;
    }, 'Год должен быть от 1900 до 2060')
    .optional(),

  images: z
    .array(z.string().uuid('Некорректный UUID изображения'))
    .max(10, 'Максимум 10 изображений')
    .optional()
    .default([]),
});

/* ─────────────────────────────────────────
   Схема query-параметров поиска
   GET /api/holidays?search=...&month=...&limit=...
───────────────────────────────────────── */
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

/* ─────────────────────────────────────────
   Мidleware-фабрика: валидация тела запроса
───────────────────────────────────────── */
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
    req.body = result.data; // перезаписываем очищенными данными
    next();
  };
}

/* ─────────────────────────────────────────
   Мidleware-фабрика: валидация URL-параметров
───────────────────────────────────────── */
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

/* ─────────────────────────────────────────
   Мidleware-фабрика: валидация query-строки
───────────────────────────────────────── */
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
