// Self-tests for the weekday/month profile helpers against planted effects in the synth data.

import { test, assert } from '../core/harness.js';
import { synth as cfg } from '../config/synth.js';
import { viewSettings } from '../config/views.js';
import { generate } from '../core/synth.js';
import { buildWeekdayProfile, buildMonthProfile } from '../core/profile-demo.js';

const data = generate(cfg);
function idOf(text) { return data.labels.find((l) => l.text === text).id; }
function meanRate(rows, months) {
  let sum = 0;
  for (const m of months) sum += rows[m].rate;
  return sum / months.length;
}

test('P4: seasonal planted effect: Hot bath H+ winter rate is about twice the other months', () => {
  const p = buildMonthProfile(data, idOf('Hot bath H+'));
  const winter = [11, 0, 1];
  const other = [2, 3, 4, 5, 6, 7, 8, 9, 10];
  const ratio = meanRate(p.rows, winter) / meanRate(p.rows, other);
  assert.ok(ratio >= cfg.expect.seasonalRatio[0] && ratio <= cfg.expect.seasonalRatio[1], 'ratio ' + ratio.toFixed(3));
});

test('P3: planted weekend modifier: Friends meetup P+ peaks on Saturday or Sunday', () => {
  const weekStart = viewSettings.time.weekStart;
  assert.equal(weekStart, 1, 'test assumes Monday-first');
  const w = buildWeekdayProfile(data, idOf('Friends meetup P+'), weekStart);
  let c = 0;
  for (let i = 1; i < w.rows.length; i += 1) {
    if (w.rows[i].rate > w.rows[c].rate) c = i;
  }
  assert.ok(c === 5 || c === 6, 'peak column ' + c);
});

test('P3: rows have seven weekdays and n sums to the number of days', () => {
  const w = buildWeekdayProfile(data, idOf('Friends meetup P+'), viewSettings.time.weekStart);
  assert.equal(w.rows.length, 7, 'rows');
  assert.equal(w.rows.reduce((s, r) => s + r.n, 0), data.days.length, 'n sums to days');
});

test('P4: month rows have twelve months and n sums to the number of days', () => {
  const p = buildMonthProfile(data, idOf('Hot bath H+'));
  assert.equal(p.rows.length, 12, 'rows');
  assert.equal(p.rows.reduce((s, r) => s + r.n, 0), data.days.length, 'n sums to days');
});
