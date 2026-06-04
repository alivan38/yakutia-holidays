/**
 * Проверка дубликатов перед созданием записей в Directus.
 * Ключ: нормализованное название + дата (день/месяц для праздников) + народ (если даты нет).
 */

export function normalizeTitle(title) {
  return String(title ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function normalizePeople(people) {
  return String(people ?? '').trim().toLowerCase();
}

/** MM-DD из YYYY-MM-DD (для повторяющихся дат праздников). */
export function monthDayKey(ymd) {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(String(ymd))) return null;
  return String(ymd).slice(5);
}

function resolveItemDate(item) {
  const raw = item?.date ?? item?.holiday_date ?? item?.event_date;
  if (!raw) return '';
  const str = String(raw).trim();
  const iso = str.match(/^(\d{4}-\d{2}-\d{2})/);
  return iso ? iso[1] : str;
}

async function fetchDirectusItems(url, headers) {
  const r = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(json?.errors?.[0]?.message || `Directus ${r.status}`);
  }
  return json.data ?? [];
}

function titleMatches(item, nTitle) {
  return normalizeTitle(item?.title) === nTitle;
}

function peopleMatches(item, nPeople) {
  return normalizePeople(item?.people) === nPeople;
}

function datesMatchByMonthDay(itemDate, targetMd) {
  if (!targetMd) return !itemDate;
  const itemMd = monthDayKey(itemDate);
  return itemMd === targetMd;
}

/**
 * @returns {Promise<{ type: 'proposal'|'holiday', id: string|number }|null>}
 */
export async function findProposalDuplicate({ directusUrl, headers, title, date, people }) {
  const nTitle = normalizeTitle(title);
  const nPeople = normalizePeople(people);
  const targetMd = date ? monthDayKey(date) : null;

  const proposalParams = new URLSearchParams({
    fields: 'id,title,date,people',
    limit: '100',
  });
  if (date) {
    proposalParams.set('filter[date][_eq]', date);
  } else {
    proposalParams.set('filter[date][_null]', 'true');
  }

  const proposals = await fetchDirectusItems(
    `${directusUrl}/items/propsals?${proposalParams}`,
    headers,
  );

  for (const row of proposals) {
    if (!titleMatches(row, nTitle)) continue;
    if (date) {
      if (datesMatchByMonthDay(resolveItemDate(row), targetMd)) {
        return { type: 'proposal', id: row.id };
      }
      continue;
    }
    if (peopleMatches(row, nPeople)) {
      return { type: 'proposal', id: row.id };
    }
  }

  const holidays = await fetchDirectusItems(
    `${directusUrl}/items/holidays?fields=id,title,date,people&limit=-1`,
    headers,
  );

  for (const row of holidays) {
    if (!titleMatches(row, nTitle)) continue;
    const rowDate = resolveItemDate(row);
    if (date) {
      if (datesMatchByMonthDay(rowDate, targetMd)) {
        return { type: 'holiday', id: row.id };
      }
    } else if (peopleMatches(row, nPeople)) {
      return { type: 'holiday', id: row.id };
    }
  }

  return null;
}

/**
 * @returns {Promise<{ type: 'event', id: string|number }|null>}
 */
export async function findHolidayEventDuplicate({
  directusUrl,
  headers,
  holidayId,
  title,
  eventDate,
}) {
  const nTitle = normalizeTitle(title);
  const params = new URLSearchParams({
    fields: 'id,title,event_date',
    limit: '50',
    'filter[holiday_id][_eq]': String(holidayId),
    'filter[event_date][_eq]': eventDate,
  });

  const events = await fetchDirectusItems(
    `${directusUrl}/items/holiday_events?${params}`,
    headers,
  );

  const match = events.find((row) => titleMatches(row, nTitle));
  return match ? { type: 'event', id: match.id } : null;
}

export function duplicateErrorMessage(duplicate) {
  if (!duplicate) return 'Такая запись уже существует';
  if (duplicate.type === 'holiday') {
    return 'Праздник с таким названием и датой уже есть в каталоге';
  }
  if (duplicate.type === 'proposal') {
    return 'Праздник с таким названием и датой уже отправлен на модерацию';
  }
  if (duplicate.type === 'event') {
    return 'Мероприятие с таким названием и датой уже добавлено для этого праздника';
  }
  return 'Такая запись уже существует';
}
