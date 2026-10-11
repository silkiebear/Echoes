import { test, skip, assert } from '../core/harness.js';

// Copied from SPEC section 2 on purpose: this test checks the page against the spec, not against the linter.
const SPEC_CSP = {
  'default-src': "'none'",
  'script-src': "'self'",
  'style-src': "'self' 'unsafe-inline'",
  'img-src': "'self' data: blob:",
  'connect-src': "'none'",
  'font-src': "'none'",
  'form-action': "'none'",
  'base-uri': "'none'",
};
const SPEC_ROBOTS = ['noindex', 'nofollow', 'noarchive', 'nosnippet', 'noimageindex', 'noai', 'noimageai'];

function parseCsp(content) {
  const map = {};
  for (const part of content.split(';')) {
    const tokens = part.trim().split(/\s+/).filter(Boolean);
    if (tokens.length > 0) map[tokens[0]] = tokens.slice(1).join(' ');
  }
  return map;
}

if (typeof document === 'undefined') {
  skip('CSP meta matches SPEC section 2 exactly', 'browser only');
  skip('robots meta contains every SPEC section 2 token', 'browser only');
} else {
  test('CSP meta matches SPEC section 2 exactly', () => {
    const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    assert.ok(meta, 'CSP meta is missing');
    assert.deepEqual(parseCsp(meta.getAttribute('content') || ''), SPEC_CSP);
  });

  test('robots meta contains every SPEC section 2 token', () => {
    const meta = document.querySelector('meta[name="robots"]');
    assert.ok(meta, 'robots meta is missing');
    const tokens = (meta.getAttribute('content') || '').split(',').map((t) => t.trim());
    for (const token of SPEC_ROBOTS) assert.ok(tokens.includes(token), `robots token missing: ${token}`);
  });
}
