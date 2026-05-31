const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Загружает список праздников.
 * @param {{ search?: string, month?: number, limit?: number, offset?: number }} [filters]
 * @returns {Promise<{ data: object[], meta: { total_count?: number } }>}
 */
export async function fetchHolidays(filters = {}) {
  const params = new URLSearchParams();
  if (filters.search !== undefined) params.set('search', filters.search);
  if (filters.month  !== undefined) params.set('month',  filters.month);
  if (filters.limit  !== undefined) params.set('limit',  filters.limit);
  if (filters.offset !== undefined) params.set('offset', filters.offset);

  const qs = params.toString();
  const res = await fetch(`${API_URL}/api/holidays${qs ? '?' + qs : ''}`);
  if (!res.ok) throw new Error('Ошибка загрузки праздников');
  return res.json(); // { data, meta }
}

/**
 * Загружает праздник по ID (slug или число).
 * Поля: id, title, subtitle, date, description, full_description, people, region, image, tags
 * @param {string} id
 * @returns {Promise<object>}
 */
export async function fetchHolidayById(id) {
  const res = await fetch(`${API_URL}/api/holidays/${id}`);
  if (!res.ok) throw new Error('Праздник не найден');
  return res.json();
}
