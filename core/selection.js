// Label search and selection for the Explore tab (phase 4c, 4c.2). Pure: no DOM, no store access. Labels are looked up
// through arrays and string methods only, so a label named "__proto__" or "constructor" changes no object.

// labels: [{ id, text }]; dayCounts: array indexed by label id (days present). Returns at most cfg.maxResults entries,
// most days first, then by text.
export function searchLabels(labels, dayCounts, text, cfg) {
  const query = String(text).normalize('NFC').trim().toLowerCase();
  if (query.length < cfg.minChars) return [];
  const hits = [];
  for (const label of labels) {
    if (label.text.normalize('NFC').toLowerCase().includes(query)) {
      hits.push({ id: label.id, text: label.text, days: dayCounts[label.id] ?? 0 });
    }
  }
  hits.sort((a, b) => (b.days - a.days) || (a.text < b.text ? -1 : (a.text > b.text ? 1 : 0)));
  return hits.slice(0, cfg.maxResults);
}

// Days present for each label, as an array indexed by label id. Cached per data object (the data is not changed).
const countCache = new WeakMap();
export function dayCountsOf(data) {
  if (!countCache.has(data)) {
    const counts = data.labels.map(() => 0);
    for (const day of data.days) {
      for (const id of day.labels) counts[id] += 1;
    }
    countCache.set(data, counts);
  }
  return countCache.get(data);
}

// Adds the id, or removes it when it is already selected. Past max the selection is returned unchanged (a copy).
export function toggleSelection(selection, id, max) {
  if (selection.includes(id)) return selection.filter((x) => x !== id);
  if (selection.length >= max) return selection.slice();
  return [...selection, id];
}
