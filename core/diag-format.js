// Pure helpers for diagnostics text. diag.js passes values through its redaction function before they reach
// these helpers, so nothing here reads module state.

// Headings, keys and fixed labels are written as they are; only values are redacted (SPEC 8). A real label such
// as 'date' or 'ice' must not alter the app's own vocabulary.
export function block(name, lines) {
  return `== ${name} [SAFE] ==\n${lines.join('\n')}\n\n`;
}

// Plain recursive copy. A JSON round trip would turn Infinity and NaN into null and change build() output.
export function copy(value) {
  if (Array.isArray(value)) return value.map(copy);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, copy(v)]));
  return value;
}

// Plain names in columnNames and mapped.* are structure (SPEC 8): shown as they are, even when a real label has the same
// text. The rule matches export-parse.js PLAIN_NAME. Everything else goes through redact.
const PLAIN_NAME = /^[a-z0-9_]+$/;
const STRUCTURE_KEYS = /^(columnNames|mapped\.)/;
export function parseStatValue(value, name, redact, maxChars) {
  const plain = typeof value === 'string' && STRUCTURE_KEYS.test(name) && PLAIN_NAME.test(value) && value.length <= maxChars;
  return plain ? value : redact(value);
}

// Nested objects print as "key.sub: value"; arrays as one comma-separated line. redact(value, name) is called with the
// full key path, so the caller can tell structure (column names) from values.
export function flattenStats(obj, redact, prefix = '') {
  const lines = [];
  for (const [key, value] of Object.entries(obj)) {
    const name = prefix + key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      lines.push(...flattenStats(value, redact, `${name}.`));
    } else if (Array.isArray(value)) {
      lines.push(`${name}: ${value.map((item) => redact(item, name)).join(', ')}`);
    } else {
      lines.push(`${name}: ${redact(value, name)}`);
    }
  }
  return lines;
}
