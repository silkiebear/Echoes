// Co-occurrence matrix (phase 4h, C1): for a set of labels, how often each pair shares a day.
// Labels are untrusted text, so ids are stored in a Map/Set, never as keys of a plain object.
import { combos } from '../config/combos.js';

export function coOccurrence(days, ids) {
  // Shape first: days must be an array of arrays, every id a string (TypeError); the count and uniqueness of ids
  // are RangeError, so a too-short or duplicated selection is reported, not silently ignored.
  if (!Array.isArray(days)) throw new TypeError('days must be an array of days');
  for (const day of days) {
    if (!Array.isArray(day)) throw new TypeError('each day must be an array of labels');
  }
  if (ids.length < 2 || ids.length > combos.coMax) {
    throw new RangeError(`ids must have 2 to ${combos.coMax} entries`);
  }
  for (const id of ids) {
    if (typeof id !== 'string') throw new TypeError('each id must be a string');
  }
  const distinct = new Set();
  for (const id of ids) {
    if (distinct.has(id)) throw new RangeError('ids must be distinct');
    distinct.add(id);
  }

  const n = days.length;
  const k = ids.length;
  const index = new Map();
  for (let i = 0; i < k; i += 1) index.set(ids[i], i);

  const counts = new Array(k).fill(0);
  const both = [];
  for (let i = 0; i < k; i += 1) both.push(new Array(k).fill(0));

  for (const day of days) {
    // Deduplicate within the day, then keep only labels that are in the selection.
    const present = new Set();
    for (const label of day) {
      const idx = index.get(label);
      if (idx !== undefined) present.add(idx);
    }
    for (const i of present) counts[i] += 1;
    const labels = [...present];
    for (let a = 0; a < labels.length; a += 1) {
      for (let b = a; b < labels.length; b += 1) {
        both[labels[a]][labels[b]] += 1;
        if (a !== b) both[labels[b]][labels[a]] += 1;
      }
    }
  }

  // conditional[i][j] = both[i][j] / counts[i]; a row with no days has no rate, so it is all null.
  const conditional = [];
  for (let i = 0; i < k; i += 1) {
    if (counts[i] === 0) {
      conditional.push(new Array(k).fill(null));
    } else {
      const row = new Array(k);
      for (let j = 0; j < k; j += 1) row[j] = both[i][j] / counts[i];
      conditional.push(row);
    }
  }

  return { n, ids: ids.slice(), counts, both, conditional };
}
