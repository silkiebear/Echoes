// Label codes (SPEC 11). A code is the last whitespace-separated token of a label text: Domain (one of A-Z or 0-9),
// optional Sub (one of a-z or 0-9), then a value mark. The marks are ++, +, +-, =, -+, - and --. The two-character
// marks come first in the alternation so that "--" is not read as "-" followed by a stray "-". A label is "coded" only
// when its Domain is one of the settings categories; a valid code with an unknown Domain is "possible".
import * as diag from './diag.js';

const CODE_PATTERN = /^([A-Z0-9])([a-z0-9])?(\+\+|\+-|-\+|--|\+|-|=)$/;
const MIN_REGISTER_LENGTH = 2;

// The parts of one code token, or null when the token has no code shape (the caller checks the category).
export function parseCode(token) {
  if (typeof token !== 'string') return null;
  const m = CODE_PATTERN.exec(token);
  return m ? { category: m[1], sub: m[2] ?? null, mark: m[3] } : null;
}

// A last token that is not a valid code leaves the whole text as the name, so no word is lost from it.
export function splitLabel(text) {
  const trimmed = String(text).trim();
  const tokens = trimmed.split(/\s+/);
  const code = tokens.length >= 2 ? tokens[tokens.length - 1] : null;
  if (code === null || parseCode(code) === null) return { name: trimmed, code: null };
  return { name: trimmed.slice(0, trimmed.length - code.length).trim(), code };
}

// One label read in full, for the naming guide's checker. Same rules as classifyLabels.
export function readLabel(text, categories) {
  const { name, code } = splitLabel(text);
  if (name.length >= MIN_REGISTER_LENGTH) diag.register(name, 'label');
  if (code === null) return { name, category: null, sub: null, mark: null, status: 'uncoded' };
  const parts = parseCode(code);
  const known = categories.some((c) => c.code === parts.category);
  return { name, category: parts.category, sub: parts.sub, mark: parts.mark, status: known ? 'coded' : 'possible' };
}

// Names are registered with diag as they are read, so diagnostics show tokens instead of the text.
export function classifyLabels(labels, categories) {
  const domains = new Set(categories.map((c) => c.code));
  return labels.map(({ id, text }) => {
    const { name, code } = splitLabel(text);
    if (name.length >= MIN_REGISTER_LENGTH) diag.register(name, 'label');
    if (code === null) return { id, text, name, code: null, status: 'uncoded' };
    return { id, text, name, code, status: domains.has(code[0]) ? 'coded' : 'possible' };
  });
}

function compareText(a, b) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function codeStats(classified, entries) {
  const uses = new Map();
  for (const entry of entries) {
    for (const id of entry.labels) uses.set(id, (uses.get(id) || 0) + 1);
  }
  let coded = 0;
  let possible = 0;
  let uncoded = 0;
  for (const c of classified) {
    if (c.status === 'coded') coded += 1;
    else if (c.status === 'possible') possible += 1;
    else uncoded += 1;
  }
  const total = classified.length;
  const list = classified
    .map((c) => ({ id: c.id, text: c.text, status: c.status, entries: uses.get(c.id) || 0 }))
    .sort((a, b) => b.entries - a.entries || compareText(a.text, b.text));
  return {
    total,
    coded,
    possible,
    uncoded,
    percentUncoded: total === 0 ? 0 : (possible + uncoded) / total,
    list,
  };
}
