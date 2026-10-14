import { test, assert } from '../core/harness.js';
import { synth as cfg } from '../config/synth.js';
import { generate } from '../core/synth.js';
import { buildE4Data } from '../core/event-study-demo.js';

const data = generate(cfg);
function idOf(text) {
  return data.labels.find((l) => l.text === text).id;
}

test('E4: planted alcohol effect gives Headache B- the largest positive difference (window 3)', () => {
  const e = buildE4Data(data, idOf('Alcohol H-'), 3);
  assert.ok(e.nEvents > 0, 'events exist');
  const top = e.rows[0];
  assert.equal(top.outcomeLabel, 'Headache B-', 'top row');
  assert.ok(top.diff > 0, 'positive diff');
  assert.ok(
    top.diff >= cfg.expect.alcoholHeadacheDiff3d[0] &&
    top.diff <= cfg.expect.alcoholHeadacheDiff3d[1],
    'diff ' + top.diff.toFixed(3)
  );
  const maxDiff = Math.max(...e.rows.map((r) => r.diff));
  assert.ok(Math.abs(maxDiff - top.diff) < 1e-9, 'largest positive diff first');
});

test('E4: two exposures 3 days apart count as one event with gap 7', () => {
  const labels = [{ id: 0, text: 'Expo' }, { id: 1, text: 'Out' }];
  const days = [];
  for (let i = 0; i < 30; i += 1) {
    days.push({ date: '2026-01-01', labels: [] });
  }
  days[15].labels = [0];
  days[18].labels = [0];
  const e = buildE4Data({ labels, days }, 0, 3);
  assert.equal(e.nEvents, 1, 'one event after de-clustering');
});

test('E4: no events gives no rows and no error', () => {
  const labels = [{ id: 0, text: 'Expo' }, { id: 1, text: 'Out' }];
  const days = [];
  for (let i = 0; i < 30; i += 1) {
    days.push({ date: '2026-01-01', labels: [] });
  }
  const e = buildE4Data({ labels, days }, 0, 3);
  assert.equal(e.nEvents, 0);
  assert.equal(e.rows.length, 0);
});
