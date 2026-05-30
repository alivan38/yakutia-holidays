// Общие константы приложения

export const PEOPLES = ['Якуты', 'Эвенки', 'Эвены', 'Юкагиры', 'Долганы', 'Чукчи', 'Другое'];

export const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

const MONTH_NAMES_GENITIVE = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

// Яркие градиентные фоны для карточек
const PEOPLE_GRADIENTS = {
  'Якуты':   'linear-gradient(135deg, #ff3a5c 0%, #c41e3a 60%, #8b0020 100%)',
  'Эвенки':  'linear-gradient(135deg, #ffd700 0%, #f5a800 60%, #c47a00 100%)',
  'Эвены':   'linear-gradient(135deg, #40b8ff 0%, #1a7ed4 60%, #0a4a9f 100%)',
  'Юкагиры': 'linear-gradient(135deg, #ff4444 0%, #cc0000 60%, #7a0000 100%)',
  'Долганы': 'linear-gradient(135deg, #ff9a2e 0%, #e06800 60%, #a03e00 100%)',
  'Чукчи':   'linear-gradient(135deg, #9e9e9e 0%, #616161 60%, #2e2e2e 100%)',
};

export function getColorByPeople(people) {
  return PEOPLE_GRADIENTS[people] || 'linear-gradient(135deg, #5ba8ff 0%, #2563eb 60%, #1034a6 100%)';
}

export function formatDateShort(dateObj) {
  return `${String(dateObj.getDate()).padStart(2, '0')}.${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
}

export function formatDateLong(dateStr) {
  const [, month, day] = dateStr.split('-');
  return `${parseInt(day, 10)} ${MONTH_NAMES_GENITIVE[parseInt(month, 10) - 1]}`;
}

export function truncate(text, maxLength) {
  return text.length > maxLength ? text.slice(0, maxLength) + '…' : text;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseImages(raw) {
  if (!raw) return [];
  if (Array.isArray(raw))
    return raw.map(item => (typeof item === 'string' ? item : item?.id ?? null)).filter(Boolean);
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (UUID_RE.test(t)) return [t];
    try {
      const parsed = JSON.parse(t);
      if (Array.isArray(parsed))
        return parsed.map(item => (typeof item === 'string' ? item : item?.id ?? null)).filter(Boolean);
      if (parsed?.id) return [parsed.id];
    } catch {}
    if (t.startsWith('{'))
      return t.slice(1, -1).split(',').map(s => s.replace(/^"|"$/g, '').trim()).filter(Boolean);
  }
  if (raw?.id) return [raw.id];
  return [];
}

export function resolveImages(data) {
  const imgs = parseImages(data.images);
  return imgs.length > 0 ? imgs : parseImages(data.image);
}

export const DIRECTUS_ASSETS = 'http://localhost:8055/assets';

// Возвращает полный URL первого изображения праздника или null
export function getCoverImage(data) {
  const imgs = resolveImages(data);
  if (imgs.length === 0) return null;
  const first = imgs[0];
  if (/^https?:\/\//i.test(first)) return first;
  return `${DIRECTUS_ASSETS}/${first}`;
}
