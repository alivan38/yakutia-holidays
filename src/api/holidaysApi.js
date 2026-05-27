const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export async function fetchHolidays() {
  const res = await fetch(`${API_URL}/api/holidays`);
  if (!res.ok) return [];
  return res.json();
}
