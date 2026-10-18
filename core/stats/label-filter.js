// Label filter for the scan result (phase 4b, tier 4b.4). Pure: no I/O, no logging. The text is user input: the card
// registers it with diag.register before a run, and nothing here logs it.
export const FILTER_ROLES = ['either', 'exposure', 'outcome'];

// Case folding for matching: NFC first, so composed and decomposed spellings match (as diag.register does).
const fold = (text) => text.normalize('NFC').toLowerCase();

// Returns { text, role } with the text folded, or null when there is no filter: a missing object, text shorter than
// minChars after NFC and trim, or nothing else. An unknown role falls back to 'either'.
export function normalizeFilter(raw, minChars) {
  if (raw === null || typeof raw !== 'object') return null;
  const text = typeof raw.text === 'string' ? raw.text.normalize('NFC').trim() : '';
  if (Array.from(text).length < minChars) return null;
  const role = FILTER_ROLES.indexOf(raw.role) === -1 ? 'either' : raw.role;
  return { text: fold(text), role };
}

// pair = { exposure, outcome }: the label texts of one row. A row matches when the chosen label contains the text
// (case-insensitive substring). With no filter every row matches.
export function matchesFilter(pair, filter) {
  if (!filter) return true;
  const needle = fold(filter.text);
  const e = fold(pair.exposure).indexOf(needle) !== -1;
  const o = fold(pair.outcome).indexOf(needle) !== -1;
  if (filter.role === 'exposure') return e;
  if (filter.role === 'outcome') return o;
  return e || o;
}
