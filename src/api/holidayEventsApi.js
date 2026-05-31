const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Загружает список прошедших мероприятий для праздника.
 * Возвращает массив объектов:
 * [{ id, title, event_date, description, images: [{ directus_files_id: { id, type, ... } }] }]
 *
 * @param {number|string} holidayId
 * @returns {Promise<object[]>}
 */
export async function fetchHolidayEvents(holidayId) {
  const res = await fetch(`${API_URL}/api/holidays/${holidayId}/events`);
  if (!res.ok) throw new Error('Ошибка загрузки мероприятий');
  return res.json();
}

/**
 * Строит URL для просмотра файла через Directus.
 * @param {string} fileId - UUID файла из directus_files
 * @param {{ width?: number, height?: number, quality?: number }} [transforms]
 * @returns {string}
 */
export function getEventFileUrl(fileId, transforms = {}) {
  const base = (import.meta.env.VITE_DIRECTUS_URL || 'http://localhost:8055');
  const params = new URLSearchParams();
  if (transforms.width)   params.set('width',   transforms.width);
  if (transforms.height)  params.set('height',  transforms.height);
  if (transforms.quality) params.set('quality', transforms.quality);
  const qs = params.toString();
  return `${base}/assets/${fileId}${qs ? '?' + qs : ''}`;
}
