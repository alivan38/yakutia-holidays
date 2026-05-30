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

// Градиентные фоны для карточек — подобраны под каждый народ
const PEOPLE_GRADIENTS = {
  'Якуты':   'linear-gradient(135deg, #c41e3a 0%, #6b0f1a 100%)',
  'Эвенки':  'linear-gradient(135deg, #e6a817 0%, #a05f00 100%)',
  'Эвены':   'linear-gradient(135deg, #4a90c4 0%, #1a4a72 100%)',
  'Юкагиры': 'linear-gradient(135deg, #b71c1c 0%, #4a0000 100%)',
  'Долганы': 'linear-gradient(135deg, #cc7722 0%, #7a3e00 100%)',
  'Чукчи':   'linear-gradient(135deg, #757575 0%, #3a3a3a 100%)',
};

export function getColorByPeople(people) {
  return PEOPLE_GRADIENTS[people] || 'linear-gradient(135deg, #4a90e2 0%, #1a4a8f 100%)';
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
  // Уже готовый URL — возвращаем как есть, иначе строим путь к ассету Directus
  if (/^https?:\/\//i.test(first)) return first;
  return `${DIRECTUS_ASSETS}/${first}`;
}
