import assert from 'assert';
import {
  normalizeTitle,
  monthDayKey,
  normalizePeople,
} from './duplicateCheck.js';

assert.strictEqual(normalizeTitle('  Ёлка   Дед '), 'ёлка дед');
assert.strictEqual(monthDayKey('2000-06-12'), '06-12');
assert.strictEqual(normalizePeople('Якуты'), 'якуты');

console.log('duplicateCheck: ok');
