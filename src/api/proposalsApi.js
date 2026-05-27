import { DIRECTUS_URL } from '../constants';

const LOGIN_EMAIL    = 'admin@yakutia.ru';
const LOGIN_PASSWORD = 'admin123';

async function getToken() {
  const res = await fetch(`${DIRECTUS_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: LOGIN_EMAIL, password: LOGIN_PASSWORD }),
  });
  const json = await res.json();
  return json?.data?.access_token ?? null;
}

async function uploadFile(file, token) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${DIRECTUS_URL}/files`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const json = await res.json();
  return json?.data?.id ?? null;
}

export async function fetchApprovedProposals() {
  const res = await fetch(`${DIRECTUS_URL}/items/propsals?filter[approved][_eq]=true&limit=-1`);
  if (!res.ok) return [];
  const json = await res.json();
  return json.data || [];
}

export async function fetchProposalById(id) {
  const res = await fetch(`${DIRECTUS_URL}/items/propsals/${id}`);
  if (!res.ok) return null;
  const json = await res.json();
  return json.data || null;
}

export async function uploadProposalFiles(files) {
  if (!files.length) return [];
  const token = await getToken();
  const ids = await Promise.all(files.map(f => uploadFile(f, token)));
  return ids.filter(Boolean);
}

export async function createProposal(data) {
  const token = await getToken();
  const res = await fetch(`${DIRECTUS_URL}/items/propsals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err?.errors?.[0]?.message || 'Ошибка сохранения');
  }
  return (await res.json()).data;
}
