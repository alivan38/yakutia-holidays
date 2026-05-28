const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export async function fetchHolidays() {
  const res = await fetch(`${API_URL}/api/holidays`);
  if (!res.ok) throw new Error('Ошибка загрузки праздников');
  return res.json();
}

export async function fetchHolidayById(id) {
  const res = await fetch(`${API_URL}/api/holidays/${id}`);
  if (!res.ok) throw new Error('Праздник не найден');
  return res.json();
}
