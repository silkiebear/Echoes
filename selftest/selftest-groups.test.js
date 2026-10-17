// Self-test groups (phase 4a, U9): every test file is in exactly one group, and the checker catches planted errors.
// Pure, so it runs in Node and in the browser. The timing rule (no group over 20 percent of the time) is checked by
// hand from the Chromium timings recorded in the phase 4a report.
import { test, assert } from '../core/harness.js';
import { groups } from '../config/selftest-groups.js';
import { checkGroups } from '../core/selftest-groups.js';
import { tests } from './index.js';

test('real groups: every file in selftest\\index.js is in exactly one group; no unknown file, unique ids, no empty group', () => {
  assert.deepEqual(checkGroups(groups, tests), [], 'group table problems');
});

test('checkGroups catches planted errors: unknown file, file in two groups, duplicate id, empty group, missing file', () => {
  const files = ['./a.test.js', './b.test.js'];
  const planted = [
    { id: 'g1', title: 'One', files: ['./a.test.js', './nope.test.js'] },
    { id: 'g1', title: 'Again', files: ['./a.test.js'] },
    { id: 'g3', title: 'Empty', files: [] },
  ];
  const text = checkGroups(planted, files).join('\n');
  assert.ok(text.includes('unknown file in group g1: ./nope.test.js'), `unknown file not reported: ${text}`);
  assert.ok(text.includes('file in two groups: ./a.test.js (g1 and g1)'), `duplicate file not reported: ${text}`);
  assert.ok(text.includes('duplicate group id: g1'), `duplicate id not reported: ${text}`);
  assert.ok(text.includes('empty group: g3'), `empty group not reported: ${text}`);
  assert.ok(text.includes('file in no group: ./b.test.js'), `missing file not reported: ${text}`);
});
