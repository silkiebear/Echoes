import { test, assert } from '../core/harness.js';

// Each test loads a fresh copy of diag.js so the live app state is never reset.
let freshCount = 0;
async function fresh() {
  freshCount += 1;
  return import(new URL(`../core/diag.js?parsestats=${freshCount}`, import.meta.url).href);
}

// A real label such as 'date' (4 characters, matched as a substring) must not replace the column names
// full_date and date, but free text that carries it is still redacted.
test('PARSE STATS keeps column names that match a real label; free text is still redacted', async () => {
  const d = await fresh();
  d.register('date', 'label');
  d.register('columnNames', 'label');
  d.setParseStats({
    columnNames: ['full_date', 'date'],
    mapped: { date: 'full_date' },
    errors: ['no date column; header columns: date'],
  });
  const text = d.build();
  const section = text.slice(text.indexOf('== PARSE STATS'));
  assert.ok(section.includes('columnNames: full_date, date'), 'column names not read as they are');
  assert.ok(section.includes('mapped.date: full_date'), 'mapped name not read as it is');
  assert.ok(section.includes('errors: no L0001 column; header columns: L0001'), 'free text not redacted');
  assert.ok(section.includes('columnNames: '), 'key name changed by a registered label');
});
