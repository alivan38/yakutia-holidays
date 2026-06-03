import { apiPath } from './baseUrl.js';

function formatApiError(payload, fallback = 'Ошибка отправки') {
  if (payload?.details?.length) {
    return payload.details.map(d => d.message).join('. ');
  }
  return payload?.error || fallback;
}

export async function fetchHolidayEvents(holidayId) {
  const res = await fetch(apiPath(`/api/holidays/${holidayId}/events`));
  if (!res.ok) throw new Error('Ошибка загрузки мероприятий');
  return res.json();
}

export async function submitHolidayEvent(holidayId, data, { captchaToken } = {}) {
  const res = await fetch(apiPath(`/api/holidays/${holidayId}/events`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...data,
      ...(captchaToken ? { captcha_token: captchaToken } : {}),
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(formatApiError(err, 'Ошибка отправки'));
  }
  return res.json();
}

export async function uploadEventFiles(files) {
  const form = new FormData();
  files.forEach(f => form.append('files', f));
  const res = await fetch(apiPath('/api/holiday-events/upload'), {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error(formatApiError(await res.json().catch(() => ({})), 'Ошибка загрузки файлов'));
  const json = await res.json();
  return Array.isArray(json) ? json : (json.ids ?? []);
}

import { directusAssetUrl } from './directusAssetUrl.js';

export function getEventFileUrl(fileId, transforms = {}) {
  return directusAssetUrl(fileId, transforms);
}
