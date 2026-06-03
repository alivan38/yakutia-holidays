import { apiPath } from './baseUrl.js';
import { readApiError } from './apiError.js';

export async function fetchApprovedProposals() {
  const res = await fetch(apiPath('/api/proposals/approved'));
  if (!res.ok) throw new Error(await readApiError(res, 'Ошибка загрузки предложений'));
  return res.json();
}

export async function fetchProposalById(id) {
  const res = await fetch(apiPath(`/api/proposals/${id}`));
  if (!res.ok) throw new Error('Предложение не найдено');
  return res.json();
}

export async function submitProposal(data, { captchaToken } = {}) {
  const res = await fetch(apiPath('/api/proposals'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...data,
      ...(captchaToken ? { captcha_token: captchaToken } : {}),
    }),
  });
  if (!res.ok) {
    const err = await res.json();
    if (Array.isArray(err?.details) && err.details.length > 0) {
      throw new Error(err.details[0]?.message || err.error || 'Ошибка отправки');
    }
    throw new Error(err?.error || 'Ошибка отправки');
  }
  return res.json();
}

export async function uploadFiles(files) {
  const form = new FormData();
  files.forEach(f => form.append('files', f));
  const res = await fetch(apiPath('/api/proposals/upload'), {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error(await readApiError(res, 'Ошибка загрузки файлов'));
  const json = await res.json();
  return Array.isArray(json) ? json : (json.ids ?? []);
}
