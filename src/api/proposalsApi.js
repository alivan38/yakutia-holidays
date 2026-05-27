import directus from '../lib/directus';
import { readItems, readItem, createItem } from '@directus/sdk';

export async function fetchApprovedProposals() {
  return await directus.request(
    readItems('propsals', {  // ← propsals (без o)
      filter: { approved: { _eq: true } },
    })
  );
}

export async function fetchProposalById(id) {
  try {
    return await directus.request(readItem('propsals', id));  // ← propsals
  } catch {
    return null;
  }
}

export async function createProposal(data) {
  return await directus.request(createItem('propsals', data));  // ← propsals
}