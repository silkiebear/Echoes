import { dayOf, weekdayOf, addDays } from './calendar.js';

// Group tracker entries into contiguous calendar days, assigning each entry to a
// day by its minutes-after-midnight value relative to boundaryMinutes.
export function aggregate(entries, boundaryMinutes) {
  if (entries.length === 0) {
    return { days: [], entries: [] };
  }

  // Assign every entry to a calendar date up front so we never recompute it.
  const assigned = entries.map((entry) => dayOf(entry.date, entry.minutes, boundaryMinutes));

  // First and last assigned dates bound the contiguous day range.
  let first = assigned[0];
  let last = assigned[0];
  for (const date of assigned) {
    if (date < first) first = date;
    if (date > last) last = date;
  }

  // One day object per calendar date from first to last, contiguous.
  const days = [];
  const indexByDate = new Map();
  for (let date = first; ; ) {
    const day = days.length;
    indexByDate.set(date, day);
    days.push({
      day,
      date,
      weekday: weekdayOf(date),
      labels: [],
      entryCount: 0,
      moods: [],
    });
    if (date === last) break;
    date = addDays(date, 1);
  }

  // Sort entry indices by (date, minutes) so the assigned index stays aligned.
  const order = Array.from({ length: assigned.length }, (_, i) => i);
  order.sort((i, j) => compareEntries(entries[i], entries[j]));

  // Walk entries in sorted order, filling each day and building the output rows.
  const outEntries = order.map((i) => {
    const entry = entries[i];
    const dayIndex = indexByDate.get(assigned[i]);
    const day = days[dayIndex];
    day.entryCount += 1;
    for (const mood of entry.moods) day.moods.push(mood);
    for (const label of entry.labels) {
      if (!day.labels.includes(label)) day.labels.push(label);
    }
    return {
      date: entry.date,
      minutes: entry.minutes,
      day: dayIndex,
      labels: entry.labels.slice(),
      moods: entry.moods.slice(),
    };
  });

  // Labels were collected in sorted-entry order; sort ascending and dedupe.
  for (const day of days) {
    day.labels.sort((a, b) => a - b);
  }

  return { days, entries: outEntries };
}

// Same-date ordering: minutes ascending, with null minutes last.
function compareEntries(a, b) {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  const aNull = a.minutes === null;
  const bNull = b.minutes === null;
  if (aNull && bNull) return 0;
  if (aNull) return 1;
  if (bNull) return -1;
  if (a.minutes < b.minutes) return -1;
  if (a.minutes > b.minutes) return 1;
  return 0;
}
