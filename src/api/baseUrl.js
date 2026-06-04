const raw = import.meta.env.VITE_API_URL;

function normalizeApiBase(value) {
  if (value === undefined || value === '') return '';
  const s = String(value).trim().replace(/\/$/, '');
  if (!/^https?:\/\//i.test(s)) {
    if (import.meta.env.DEV) {
      console.warn(
        '[api] VITE_API_URL должен быть URL (http://...) или пустым. Сейчас:',
        s,
        '— используем относительные пути /api',
      );
    }
    return '';
  }
  return s;
}

export const API_BASE = normalizeApiBase(raw);

const DEV_API = 'http://localhost:5000';

export function apiPath(path) {
  const p = path.startsWith('/') ? path : `/${path}`;
  if (API_BASE) return `${API_BASE}${p}`;
  if (import.meta.env.DEV) return `${DEV_API}${p}`;
  return p;
}
