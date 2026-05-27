import directus from '../lib/directus';
import { readItems, readItem } from '@directus/sdk';

export const getHolidays = async () => {
  return await directus.request(readItems('holidays'));
};

export const getHolidayById = async (id) => {
  return await directus.request(readItem('holidays', id));
};

export const fetchHolidays = getHolidays;
export const fetchHolidayById = getHolidayById;