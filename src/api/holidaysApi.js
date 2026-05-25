const API_URL = 'http://localhost:5000/api/holidays';

export async function fetchHolidays() {
  const res = await fetch(API_URL);
  if (!res.ok) throw new Error('Ошибка загрузки праздников');
  return res.json();
}

export async function fetchHolidayById(id) {
  const res = await fetch(`${API_URL}/${id}`);
  if (!res.ok) throw new Error('Праздник не найден');
  return res.json();
}