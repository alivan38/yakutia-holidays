import { useQuery } from '@tanstack/react-query';
import { fetchHolidays } from '../api/holidaysApi';
import { fetchApprovedProposals } from '../api/proposalsApi';
import { fetchHolidayById } from '../api/holidaysApi';
import { fetchProposalById } from '../api/proposalsApi';
import { resolveImages } from '../constants';

export function useHolidays() {
  return useQuery({
    queryKey: ['holidays'],
    queryFn: fetchHolidays,
  });
}

export function useApprovedProposals() {
  return useQuery({
    queryKey: ['proposals', 'approved'],
    queryFn: fetchApprovedProposals,
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
          date: data.date || null,
          tags: data.tags || [],
          images: resolveImages(data),
        };
      } else {
        const data = await fetchHolidayById(realId);
        return {
          ...data,
          images: resolveImages(data),
          tags: Array.isArray(data.tags)
            ? data.tags
            : (data.tags ? data.tags.split(',').map(t => t.trim()) : []),
          fullDescription: data.full_description || data.description,
        };
      }
    },
    enabled: !!id,
  });
}
