import { test, assert } from '../core/harness.js';

import { compareBuild } from '../core/env.js';

test('compareBuild strips quotes and spaces from the CSS value', () => {
  assert.equal(compareBuild('"0.4.0"', '0.4.0'), 'ok', 'quoted 0.4.0 matches 0.4.0');
  assert.equal(compareBuild(' 0.4.0 ', '0.4.0'), 'ok', 'spaced 0.4.0 matches 0.4.0');
});

test('compareBuild reports stale and unknown', () => {
  assert.equal(compareBuild('0.3.0', '0.4.0'), 'stale', '0.3.0 is stale against 0.4.0');
  assert.equal(compareBuild('', '0.4.0'), 'unknown', 'empty CSS value is unknown');
  assert.equal(compareBuild(undefined, '0.4.0'), 'unknown', 'missing CSS value is unknown');
});
