export async function readApiError(res, fallback) {
  try {
    const json = await res.json();
    if (json?.error) return json.error;
  } catch {
  }
  if (res.status === 503) return 'Сервер данных (Directus) недоступен. Запустите Docker и directus.';
  return fallback;
}
