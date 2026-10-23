// Data preparation of the Explore cards C1, C2 and M1 (phase 4h, step 5b). Pure helpers on plain arrays: no DOM and no
// store import, so Node tests and the browser contract test run the same code the cards run. Store ids are numbers; the
// core functions take strings, and a label list of a day can hold nulls.

export function stringIds(ids) {
  return ids.filter((id) => id !== null && id !== undefined).map(String);
}

// The label ids of each observed day, as strings.
export function dayLabelIds(days) {
  return days.map((day) => stringIds(day.labels));
}

// 1 when the label is on the day, 0 otherwise, one entry per observed day in the same order.
export function presentFor(lists, id) {
  return lists.map((day) => (day.includes(id) ? 1 : 0));
}

// The day mood of each observed day (null where the day has no scored mood).
export function moodFor(days) {
  return days.map((day) => day.mood);
}

export function tooManyLabels(ids, max) {
  return ids.length > max;
}

export function textsOf(labels, ids) {
  return ids.map((id) => labels[id].text);
}

// The active period of one label (phase 4h.3b): the days from its first to its last use, with present, mood and days kept
// in step. Days before the first use and after the last one are left out, so a label added late is not compared with all
// earlier days. A label on no day gives empty slices and every day left out. The inputs are not changed.
export function activePeriod(present, mood, days) {
  if (present.length !== mood.length || present.length !== days.length) throw new Error('activePeriod: length mismatch');
  const first = present.indexOf(1);
  if (first === -1) return { present: [], mood: [], days: [], first: -1, last: -1, used: 0, excluded: days.length };
  const last = present.lastIndexOf(1);
  const used = last - first + 1;
  return {
    present: present.slice(first, last + 1),
    mood: mood.slice(first, last + 1),
    days: days.slice(first, last + 1),
    first,
    last,
    used,
    excluded: days.length - used,
  };
}

// The result for a group of days too short to resample (fewer observed days than the block length): no range, no means.
export function tooFewResult(present, blockLength, level) {
  const n1 = present.filter((p) => p === 1).length;
  return {
    status: 'too-few-days', n1, n0: present.length - n1, mean1: null, mean0: null, diff: null,
    blockLength, level, lo: null, hi: null, resamples: 0, skipped: 0,
  };
}
