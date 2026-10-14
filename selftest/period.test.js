import { test, assert } from '../core/harness.js';
import { synth as cfg } from '../config/synth.js';
import { generate } from '../core/synth.js';
import { buildHourGrid, buildDial } from '../core/period-demo.js';

const data = generate(cfg);
function idOf(text) {
  return data.labels.find((l) => l.text === text).id;
}

test('period: grid total equals the number of label marks (all labels)', () => {
  const expected = data.entries.reduce((s, e) => s + e.labels.length, 0);
  assert.equal(buildHourGrid(data, null, 'count', 1).total, expected, 'marks');
});

test('period: grid total equals the entries containing one label', () => {
  const id = idOf('Late coffee F-');
  const expected = data.entries.filter((e) => e.labels.includes(id)).length;
  assert.equal(buildHourGrid(data, id, 'count', 1).total, expected, 'coffee entries');
});

test('period: late coffee peaks inside hours 13 to 17', () => {
  const g = buildHourGrid(data, idOf('Late coffee F-'), 'count', 1);
  const colSum = new Array(24).fill(0);
  for (let c = 0; c < 24; c++) {
    for (let r = 0; r < 7; r++) {
      colSum[c] += g.cells[r][c];
    }
  }
  let peak = 0;
  for (let c = 1; c < 24; c++) {
    if (colSum[c] > colSum[peak]) peak = c;
  }
  assert.ok(peak >= 13 && peak <= 17, 'peak hour ' + peak);
});

test('period: dial bins sum to the entries containing the label', () => {
  const id = idOf('Late coffee F-');
  const expected = data.entries.filter((e) => e.labels.includes(id)).length;
  const d = buildDial(data, [id], 24);
  const sum = d.series[0].bins.reduce((a, b) => a + b, 0);
  assert.equal(sum, expected, 'dial total');
});

test('period: dial total equals the sum of all bins', () => {
  const d2 = buildDial(data, [idOf('Late coffee F-'), idOf('Poor sleep S-')], 12);
  assert.equal(d2.total, d2.series.reduce((s, x) => s + x.bins.reduce((a, b) => a + b, 0), 0), 'total');
});
