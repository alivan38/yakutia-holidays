const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Загружает список праздников.
 * Сервер возвращает { data: [...], meta: { total_count } }
 *
 * @param {{ search?: string, month?: number, limit?: number, offset?: number }} params
 * @returns {Promise<{ data: object[], meta: { total_count: number } }>}
 */
export async function fetchHolidays({ search, month, limit = 100, offset = 0 } = {}) {
  const params = new URLSearchParams({ limit, offset });
  if (search)            params.set('search', search);
  if (month !== undefined) params.set('month', month);

  const res = await fetch(`${API_URL}/api/holidays?${params}`);
  if (!res.ok) throw new Error('Ошибка загрузки праздников');

  const json = await res.json();
  // { data: [...], meta: { total_count: N } }
  return {
    data: json.data ?? [],
    meta: json.meta ?? {},
  };
}

/**
 * Загружает один праздник по id.
 * @returns {Promise<object>}
 */
export async function fetchHolidayById(id) {
  const res = await fetch(`${API_URL}/api/holidays/${id}`);
  if (!res.ok) throw new Error('Праздник не найден');
  return res.json();
}
