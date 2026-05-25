const API_URL = 'http://localhost:5000/api/proposals';

export async function fetchApprovedProposals() {
  const res = await fetch(`${API_URL}/approved`);
  if (!res.ok) {
    let message = 'Ошибка загрузки предложений';
    try {
      const err = await res.json();
      message = err.error || message;
    } catch {}
    throw new Error(message);
  }
  return res.json();
}


export async function fetchProposalById(id) {
  const res = await fetch(`${API_URL}/${id}`);
  if (!res.ok) {
    if (res.status === 404) return null;  // не найдено – вернём null
    throw new Error('Ошибка загрузки предложения');
  }
  return res.json();
}