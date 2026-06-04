import { apiPath } from './baseUrl.js';
import { readApiError } from './apiError.js';

export async function fetchHolidays(filters = {}) {
  const params = new URLSearchParams();
  if (filters.search !== undefined) params.set('search', filters.search);
  if (filters.month  !== undefined) params.set('month',  filters.month);
  if (filters.limit  !== undefined) params.set('limit',  filters.limit);
  if (filters.offset !== undefined) params.set('offset', filters.offset);

  const qs = params.toString();
  const res = await fetch(apiPath(`/api/holidays${qs ? `?${qs}` : ''}`));
  if (!res.ok) throw new Error(await readApiError(res, 'Ошибка загрузки праздников'));
  return res.json();
}

export async function fetchHolidayById(id) {
  const res = await fetch(apiPath(`/api/holidays/${id}`));
  if (!res.ok) throw new Error('Праздник не найден');
  return res.json();
}
