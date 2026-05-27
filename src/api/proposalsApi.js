const DIRECTUS_URL = 'http://localhost:8055';

// Публичное чтение одобренных предложений
export async function fetchApprovedProposals() {
  const res = await fetch(
    `${DIRECTUS_URL}/items/propsals?filter[approved][_eq]=true&limit=-1`
  );
  if (!res.ok) return [];
  const json = await res.json();
  return json.data || [];
}

// Публичное чтение одного предложения по ID
export async function fetchProposalById(id) {
  const res = await fetch(`${DIRECTUS_URL}/items/propsals/${id}`);
  if (!res.ok) return null;
  const json = await res.json();
  return json.data || null;
}

// Создание предложения — требует авторизации
export async function createProposal(data) {
  // Получаем токен
  const loginRes = await fetch(`${DIRECTUS_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@yakutia.ru', password: 'admin123' }),
  });
  const loginJson = await loginRes.json();
  const token = loginJson?.data?.access_token;

  const res = await fetch(`${DIRECTUS_URL}/items/propsals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err?.errors?.[0]?.message || 'Ошибка сохранения');
  }

  return (await res.json()).data;
}
