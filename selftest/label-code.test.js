import { test, assert } from '../core/harness.js';
import { classifyLabels, codeStats, readLabel, parseCode } from '../core/label-code.js';

const CATEGORIES = ['S', 'F', 'B', 'H', 'A', 'W', 'P', 'E', 'T', 'D', 'M'].map((code) => ({ code, name: code, color: '#000000' }));

const LABELS = [
  'Late coffee F-',
  'Poor sleep S-',
  'Long walk A+',
  'Morning run A+',
  'Deadline W-',
  'Hot bath B+',
  'Lucid dream D+',
  'Travel E=',
  'Calm M+',
  'Calm mood',
  'Study session w+',
  'Sub char Ab+',
  'Digit domain 1+',
  'Polarity eq S=',
  'Several   spaces   here   F-',
  'F-',
  'Snack X',
  'Bad polarity S*',
].map((text, id) => ({ id, text }));

const CLASSIFIED = classifyLabels(LABELS, CATEGORIES);

const EXPECTED = [
  { status: 'coded', code: 'F-' },
  { status: 'coded', code: 'S-' },
  { status: 'coded', code: 'A+' },
  { status: 'coded', code: 'A+' },
  { status: 'coded', code: 'W-' },
  { status: 'coded', code: 'B+' },
  { status: 'coded', code: 'D+' },
  { status: 'coded', code: 'E=' },
  { status: 'coded', code: 'M+' },
  { status: 'uncoded', code: null },
  { status: 'uncoded', code: null },
  { status: 'coded', code: 'Ab+' },
  { status: 'possible', code: '1+' },
  { status: 'coded', code: 'S=' },
  { status: 'coded', code: 'F-' },
  { status: 'uncoded', code: null },
  { status: 'uncoded', code: null },
  { status: 'uncoded', code: null },
];

test('classifyLabels table', () => {
  for (let i = 0; i < EXPECTED.length; i += 1) {
    const c = CLASSIFIED[i];
    assert.equal(c.status, EXPECTED[i].status, `id ${i} status`);
    assert.equal(c.code, EXPECTED[i].code, `id ${i} code`);
  }
  assert.equal(CLASSIFIED[0].name, 'Late coffee', 'id 0 name');
  assert.equal(CLASSIFIED[9].name, 'Calm mood', 'id 9 name keeps the whole text');
  assert.equal(CLASSIFIED[10].name, 'Study session w+', 'id 10 name keeps the whole text');
  assert.equal(CLASSIFIED[14].name, 'Several   spaces   here', 'id 14 name');
  assert.equal(CLASSIFIED[15].name, 'F-', 'id 15 name');
  assert.equal(CLASSIFIED[16].name, 'Snack X', 'id 16 name keeps the whole text');
  assert.equal(CLASSIFIED[17].name, 'Bad polarity S*', 'id 17 name keeps the whole text');
});

test('status counts', () => {
  const s = codeStats(CLASSIFIED, []);
  assert.equal(s.coded, 12, 'coded');
  assert.equal(s.possible, 1, 'possible');
  assert.equal(s.uncoded, 5, 'uncoded');
  assert.equal(s.total, 18, 'total');
});

test('percentUncoded', () => {
  const s = codeStats(CLASSIFIED, []);
  assert.ok(Math.abs(s.percentUncoded - 6 / 18) < 1e-9, 'percentUncoded');
});

test('list order by entries', () => {
  const ENTRIES = [{ labels: [0, 1] }, { labels: [0] }, { labels: [9] }, { labels: [] }];
  const s = codeStats(CLASSIFIED, ENTRIES);
  assert.deepEqual(s.list[0], { id: 0, text: 'Late coffee F-', status: 'coded', entries: 2 }, 'list[0]');
  assert.equal(s.list[1].text, 'Calm mood', 'list[1] text');
  assert.equal(s.list[2].text, 'Poor sleep S-', 'list[2] text');
  assert.equal(s.list.length, 18, 'list length');
});

test('codeStats total zero', () => {
  assert.deepEqual(codeStats([], []), { total: 0, coded: 0, possible: 0, uncoded: 0, percentUncoded: 0, list: [] }, 'empty');
});

test('one token uncoded', () => {
  assert.deepEqual(classifyLabels([{ id: 0, text: 'Calm' }], CATEGORIES)[0], { id: 0, text: 'Calm', name: 'Calm', code: null, status: 'uncoded' }, 'single token');
});

test('lowercase Domain never coded', () => {
  assert.equal(classifyLabels([{ id: 0, text: 'Walk a+' }], CATEGORIES)[0].status, 'uncoded', 'lowercase domain');
});

// Hand cases for the value marks (phase 4f.1.1). The expected values below ARE the specification. They were written
// before the first run of the new rule; "no code" in the table means status uncoded.
//
//   | label            | name         | category | sub  | mark | status                                              |
//   | Late coffee Fb-- | Late coffee  | F        | b    | --   | coded                                               |
//   | Walk Aa++        | Walk         | A        | a    | ++   | coded                                               |
//   | Nap S=           | Nap          | S        | none | =    | coded                                               |
//   | Quiet day M+     | Quiet day    | M        | none | +    | coded                                               |
//   | Gym A1+          | Gym          | A        | 1    | +    | coded                                               |
//   | Walk Aa+-        | Walk         | A        | a    | +-   | coded                                               |
//   | Walk Aa-+        | Walk         | A        | a    | -+   | coded                                               |
//   | Tea Fb+--        | Tea Fb+--    | none     | none | none | no code                                             |
//   | Tea Fb-+-        | Tea Fb-+-    | none     | none | none | no code                                             |
//   | Tea Fb=+         | Tea Fb=+     | none     | none | none | no code                                             |
//   | Tea Fb+++        | Tea Fb+++    | none     | none | none | no code                                             |
//   | Tea fb-          | Tea fb-      | none     | none | none | no code                                             |
//   | Tea FB-          | Tea FB-      | none     | none | none | no code                                             |
//   | Tea A11+         | Tea A11+     | none     | none | none | no code                                             |
//   | Tea Fb           | Tea Fb       | none     | none | none | no code                                             |
//   | Tea Zb-          | Tea          | Z        | b    | -    | possible code, not in registry (Z is not a starter)  |
//   | Fb-- (one token) | Fb--         | none     | none | none | no code (the existing rule: no space, no code)      |
const HAND_CASES = [
  ['Late coffee Fb--', 'Late coffee', 'F', 'b', '--', 'coded'],
  ['Walk Aa++', 'Walk', 'A', 'a', '++', 'coded'],
  ['Nap S=', 'Nap', 'S', null, '=', 'coded'],
  ['Quiet day M+', 'Quiet day', 'M', null, '+', 'coded'],
  ['Gym A1+', 'Gym', 'A', '1', '+', 'coded'],
  ['Walk Aa+-', 'Walk', 'A', 'a', '+-', 'coded'],
  ['Walk Aa-+', 'Walk', 'A', 'a', '-+', 'coded'],
  ['Tea Fb+--', 'Tea Fb+--', null, null, null, 'uncoded'],
  ['Tea Fb-+-', 'Tea Fb-+-', null, null, null, 'uncoded'],
  ['Tea Fb=+', 'Tea Fb=+', null, null, null, 'uncoded'],
  ['Tea Fb+++', 'Tea Fb+++', null, null, null, 'uncoded'],
  ['Tea fb-', 'Tea fb-', null, null, null, 'uncoded'],
  ['Tea FB-', 'Tea FB-', null, null, null, 'uncoded'],
  ['Tea A11+', 'Tea A11+', null, null, null, 'uncoded'],
  ['Tea Fb', 'Tea Fb', null, null, null, 'uncoded'],
  ['Tea Zb-', 'Tea', 'Z', 'b', '-', 'possible'],
  ['Fb--', 'Fb--', null, null, null, 'uncoded'],
];

test('hand cases: value marks ++ + +- = -+ - -- are codes; the rejected shapes are not (phase 4f.1.1)', () => {
  HAND_CASES.forEach(([text, name, category, sub, mark, status], i) => {
    const r = readLabel(text, CATEGORIES);
    assert.deepEqual([r.name, r.category, r.sub, r.mark, r.status], [name, category, sub, mark, status], `row ${i} ${text}`);
  });
});

test('parseCode: the parts of a code token, and null for shapes that are not codes', () => {
  assert.deepEqual(parseCode('Fb--'), { category: 'F', sub: 'b', mark: '--' }, 'Fb--');
  assert.deepEqual(parseCode('S='), { category: 'S', sub: null, mark: '=' }, 'S=');
  assert.equal(parseCode('Fb+--'), null, 'three-part mark');
  assert.equal(parseCode(null), null, 'null');
});

test('counts on a small hand list: coded, possible and uncoded', () => {
  const list = ['Late coffee Fb--', 'Walk Aa++', 'Tea fb-', 'Nap S=', 'Tea Zb-', 'Calm'].map((text, id) => ({ id, text }));
  const s = codeStats(classifyLabels(list, CATEGORIES), []);
  assert.deepEqual([s.coded, s.possible, s.uncoded, s.total], [3, 1, 2, 6], 'counts');
});

test('__proto__ and constructor as labels: text only, no object changes', () => {
  const list = ['__proto__', 'constructor', 'constructor Fb--'].map((text, id) => ({ id, text }));
  const classified = classifyLabels(list, CATEGORIES);
  assert.deepEqual(classified.map((c) => [c.name, c.status]), [['__proto__', 'uncoded'], ['constructor', 'uncoded'], ['constructor', 'coded']], 'status');
  assert.equal(readLabel('__proto__ Fb--', CATEGORIES).category, 'F', 'read');
  assert.equal(Object.keys(Object.prototype).length, 0, 'Object.prototype unchanged');
  const s = codeStats(classified, [{ labels: [0, 1, 2] }]);
  assert.equal(s.list.length, 3, 'list keeps every label');
});
