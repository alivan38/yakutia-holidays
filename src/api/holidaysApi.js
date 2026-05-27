import { DIRECTUS_URL } from '../constants';

export async function fetchHolidays() {
  const res = await fetch(`${DIRECTUS_URL}/items/holidays?limit=-1`);
  if (!res.ok) return [];
  const json = await res.json();
  return json.data || [];
}

export async function fetchHolidayById(id) {
  const res = await fetch(`${DIRECTUS_URL}/items/holidays/${id}`);
  if (!res.ok) return null;
  const json = await res.json();
  return json.data || null;
}
