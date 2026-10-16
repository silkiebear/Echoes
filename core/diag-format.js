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

// Nested objects print as "key.sub: value"; arrays as one comma-separated line. redact is diag.js safe().
export function flattenStats(obj, redact, prefix = '') {
  const lines = [];
  for (const [key, value] of Object.entries(obj)) {
    const name = prefix + key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      lines.push(...flattenStats(value, redact, `${name}.`));
    } else if (Array.isArray(value)) {
      lines.push(`${name}: ${value.map((item) => redact(item)).join(', ')}`);
    } else {
      lines.push(`${name}: ${redact(value)}`);
    }
  }
  return lines;
}
