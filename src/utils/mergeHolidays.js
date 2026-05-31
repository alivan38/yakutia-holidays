import { resolveImages } from '../constants';

/** Объединяет праздники из каталога и одобренные предложения в один список. */
export function mergeHolidaysAndProposals(holidays = [], proposals = []) {
  return [
    ...holidays,
    ...proposals.map(p => ({
      id: `proposal-${p.id}`,
      title: p.title,
      people: p.people,
      description: p.description,
      fullDescription: p.description,
      date: p.date || p.holiday_date || '',
      tags: p.tags || [],
      images: resolveImages(p),
      isProposal: true,
    })),
  ];
}

/** До 4 похожих праздников для боковой панели. */
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
