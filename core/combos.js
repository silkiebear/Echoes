// Label combination tables (phase 4h). Every observed day is a set of present label ids; this module counts,
// for a chosen set of labels, how many days hold all of them, none of them, or some, and records the full
// on/off pattern of the set on each day. Pure maths: no DOM, no store, no time-of-day.
import { combos } from '../config/combos.js';

// combinationTable(days, ids): `days` is an array of arrays of label id strings (one inner array per observed
// day; ids repeated inside a day count once); `ids` is an array of 1..comboMax distinct strings. Returns
// { n, ids, all, none, some, patterns } where patterns is sorted by count descending then key ascending.
export function combinationTable(days, ids) {
  // Validate shape before counting: days must be an array of arrays, ids an array of distinct strings.
  if (!Array.isArray(days)) throw new TypeError('days must be an array');
  for (const day of days) {
    if (!Array.isArray(day)) throw new TypeError('each day must be an array');
  }
  if (!Array.isArray(ids)) throw new TypeError('ids must be an array');
  if (ids.length === 0) throw new RangeError('ids must have at least one label');
  if (ids.length > combos.comboMax) throw new RangeError('too many labels for one combination');
  const seen = new Set();
  for (const id of ids) {
    if (typeof id !== 'string') throw new TypeError('each id must be a string');
    if (seen.has(id)) throw new RangeError('ids must be distinct');
    seen.add(id);
  }

  const n = days.length;
  const k = ids.length;
  const counts = new Map(); // pattern key -> how many days produced it; a Map, never an object keyed by id.
  let all = 0; // days with every id present
  let none = 0; // days with no id present
  for (const day of days) {
    const present = new Set(day); // collapses ids repeated inside one day
    let key = '';
    for (let i = 0; i < k; i += 1) {
      key += present.has(ids[i]) ? '1' : '0';
    }
    counts.set(key, (counts.get(key) ?? 0) + 1);
    if (key === '1'.repeat(k)) all += 1;
    if (key === '0'.repeat(k)) none += 1;
  }

  // Patterns that occur (count at least 1), sorted by count descending then key ascending.
  const patterns = [...counts.entries()].map(([key, count]) => ({ key, count }));
  patterns.sort((a, b) => b.count - a.count || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));

  return { n, ids: ids.slice(), all, none, some: n - all - none, patterns };
}
