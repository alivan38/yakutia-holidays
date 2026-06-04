import { resolveHolidayDate, resolveImages } from '../constants';

export function mergeHolidaysAndProposals(holidays = [], proposals = []) {
  return [
    ...holidays,
    ...proposals.map(p => ({
      id: `proposal-${p.id}`,
      title: p.title,
      people: p.people,
      description: p.description,
      fullDescription: p.description,
      date: resolveHolidayDate(p),
      tags: p.tags || [],
      images: resolveImages(p),
      isProposal: true,
    })),
  ];
}

export function pickRelatedHolidays(allHolidays, currentId, currentPeople, limit = 4) {
  const currentKey = String(currentId);
  return allHolidays
    .filter(h => h.date && String(h.id) !== currentKey)
    .sort((a, b) => {
      const aSame = a.people === currentPeople ? 0 : 1;
      const bSame = b.people === currentPeople ? 0 : 1;
      if (aSame !== bSame) return aSame - bSame;
      return a.title.localeCompare(b.title, 'ru');
    })
    .slice(0, limit);
}
