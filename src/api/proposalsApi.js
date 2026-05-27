const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export async function fetchApprovedProposals() {
  const res = await fetch(`${API_URL}/api/proposals/approved`);
  if (!res.ok) return [];
  return res.json();
}

export async function fetchProposalById(id) {
  const res = await fetch(`${API_URL}/api/proposals/${id}`);
  if (!res.ok) return null;
  return res.json();
}

export async function uploadProposalFiles(files) {
  if (!files.length) return [];
  const form = new FormData();
  files.forEach(f => form.append('files', f));
  const res = await fetch(`${API_URL}/api/proposals/upload`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) return [];
  const json = await res.json();
  return json.ids || [];
}

export async function createProposal(data) {
  const res = await fetch(`${API_URL}/api/proposals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err?.error || 'Ошибка сохранения');
  }
  return res.json();
}
