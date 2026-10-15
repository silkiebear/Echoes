import { test, assert } from '../core/harness.js';
import { classifyLabels, codeStats } from '../core/label-code.js';

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
