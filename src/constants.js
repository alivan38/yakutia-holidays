export const PEOPLES = ['Якуты', 'Эвенки', 'Эвены', 'Юкагиры', 'Долганы', 'Чукчи', 'Другое'];

export const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

const MONTH_NAMES_GENITIVE = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

const PEOPLE_GRADIENTS = {
  'Якуты':   'linear-gradient(135deg, #ff3a5c 0%, #c41e3a 60%, #8b0020 100%)',
  'Эвенки':  'linear-gradient(135deg, #ffd700 0%, #f5a800 60%, #c47a00 100%)',
  'Эвены':   'linear-gradient(135deg, #40b8ff 0%, #1a7ed4 60%, #0a4a9f 100%)',
  'Юкагиры': 'linear-gradient(135deg, #ff4444 0%, #cc0000 60%, #7a0000 100%)',
  'Долганы': 'linear-gradient(135deg, #ff9a2e 0%, #e06800 60%, #a03e00 100%)',
  'Чукчи':   'linear-gradient(135deg, #9e9e9e 0%, #616161 60%, #2e2e2e 100%)',
};

const PEOPLE_SOLID_COLORS = {
  'Якуты':   '#c41e3a',
  'Эвенки':  '#e09400',
  'Эвены':   '#1a7ed4',
  'Юкагиры': '#cc0000',
  'Долганы': '#e06800',
  'Чукчи':   '#616161',
  'Другое':  '#2563eb',
};

const DEFAULT_GRADIENT = 'linear-gradient(135deg, #5ba8ff 0%, #2563eb 60%, #1034a6 100%)';
const DEFAULT_SOLID = '#2563eb';

export function normalizePeople(people) {
  const trimmed = String(people ?? '').trim();
  if (!trimmed) return '';
  if (PEOPLE_GRADIENTS[trimmed] || PEOPLE_SOLID_COLORS[trimmed]) return trimmed;
  const lower = trimmed.toLowerCase();
  return PEOPLES.find(p => p.toLowerCase() === lower) || trimmed;
}

export function getColorByPeople(people) {
  return PEOPLE_GRADIENTS[normalizePeople(people)] || DEFAULT_GRADIENT;
}

export function getSolidColorByPeople(people) {
  const key = normalizePeople(people);
  return PEOPLE_SOLID_COLORS[key] || DEFAULT_SOLID;
}

export function formatDateShort(dateObj) {
  return `${String(dateObj.getDate()).padStart(2, '0')}.${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
}

export function formatDateLong(dateStr) {
  const [, month, day] = dateStr.split('-');
  return `${parseInt(day, 10)} ${MONTH_NAMES_GENITIVE[parseInt(month, 10) - 1]}`;
}

export function truncate(text, maxLength) {
  if (!text) return '';
  return text.length > maxLength ? text.slice(0, maxLength) + '…' : text;
}

export function holidayExcerpt(item) {
  const short = item?.subtitle?.trim();
  if (short) return short;
  return item?.description?.trim() || '';
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function extractFileId(item) {
  if (!item) return null;
  if (typeof item === 'string') return UUID_RE.test(item) ? item : null;
  if (item.directus_files_id) {
    const file = item.directus_files_id;
    return typeof file === 'string' ? file : file?.id ?? null;
  }
  if (item.id && UUID_RE.test(item.id)) return item.id;
  return null;
}

function parseImages(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw))
    return raw.map(extractFileId).filter(Boolean);
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (UUID_RE.test(t)) return [t];
    try {
      return parseImages(JSON.parse(t));
    } catch {}
    if (t.startsWith('{'))
      return t.slice(1, -1).split(',').map(s => s.replace(/^"|"$/g, '').trim()).filter(Boolean);
  }
  const id = extractFileId(raw);
  return id ? [id] : [];
}

export function resolveHolidayDate(item) {
  const raw = item?.date ?? item?.holiday_date;
  if (!raw) return '';
  const str = String(raw).trim();
  const iso = str.match(/^(\d{4}-\d{2}-\d{2})/);
  return iso ? iso[1] : str;
}

export function resolveImages(data) {
  return parseImages(data?.images);
}

import { directusAssetUrl } from './api/directusAssetUrl.js';

export function getCoverImage(data) {
  const imgs = resolveImages(data);
  if (imgs.length === 0) return null;
  return directusAssetUrl(imgs[0]) || null;
}
