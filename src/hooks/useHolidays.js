import { useQuery } from '@tanstack/react-query';
import { fetchHolidays } from '../api/holidaysApi';
import { fetchApprovedProposals } from '../api/proposalsApi';
import { fetchHolidayById } from '../api/holidaysApi';
import { fetchProposalById } from '../api/proposalsApi';
import { resolveHolidayDate, resolveImages } from '../constants';

const queryRetry = (failureCount, error) => {
  const msg = error?.message ?? '';
  if (msg.includes('Directus') || msg.includes('недоступен')) return failureCount < 5;
  return failureCount < 2;
};

export function useHolidays() {
  return useQuery({
    queryKey: ['holidays'],
    queryFn: () => fetchHolidays().then(({ data }) => data),
    retry: queryRetry,
    retryDelay: (attempt) => Math.min(1500 * 2 ** attempt, 12000),
  });
}

export function useApprovedProposals() {
  return useQuery({
    queryKey: ['proposals', 'approved'],
    queryFn: fetchApprovedProposals,
    retry: queryRetry,
    retryDelay: (attempt) => Math.min(1500 * 2 ** attempt, 12000),
  });
}

export function useHolidayById(id) {
  const isProposal = id?.startsWith('proposal-');
  const realId = isProposal ? id.replace('proposal-', '') : id;

  return useQuery({
    queryKey: isProposal ? ['proposals', realId] : ['holidays', realId],
    queryFn: async () => {
      if (isProposal) {
        const data = await fetchProposalById(realId);
        return {
          ...data,
          fullDescription: data.description,
          isProposal: true,
          date: resolveHolidayDate(data) || null,
          tags: data.tags || [],
          images: resolveImages(data),
        };
      } else {
        const data = await fetchHolidayById(realId);
        return {
          ...data,
          images: resolveImages(data),
          fullDescription: data.full_description || data.description,
        };
      }
    },
    enabled: !!id,
  });
}
