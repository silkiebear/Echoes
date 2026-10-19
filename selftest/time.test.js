import { test, assert } from '../core/harness.js';
import { synth as cfg } from '../config/synth.js';
import { viewSettings } from '../config/views.js';
import { generate } from '../core/synth.js';
import { buildRollingData, buildStripData, labelIdOf } from '../core/time-demo.js';
import { trendSlope, trendWord, rowTrend } from '../views/t3-tick-strip.js';
import { moodBin, presenceBin } from '../views/diverge.js';

const data = generate(cfg);
const T = viewSettings.time;

test('rolling share: one value per full window, each in 0..1, and the first value matches a manual count', () => {
  const id = labelIdOf(data, 'Calm M+');
  const w = 30;
  const rolling = buildRollingData(data, [id], w);
  const series = rolling.series[0].values;
  assert.equal(series.length, data.days.length - w + 1, 'length');
  assert.ok(series.every((v) => v >= 0 && v <= 1), 'range');
  const manual = data.days.slice(0, w).filter((d) => d.labels.includes(id)).length / w;
  assert.ok(Math.abs(series[0] - manual) < 1e-9, `first value ${series[0]} vs ${manual}`);
});

test('strip data: the configured number of months, oldest first, with day counts', () => {
  const ids = T.strip.labels.map((text) => labelIdOf(data, text));
  const strip = buildStripData(data, ids, T.strip.bins);
  assert.equal(strip.bins.length, T.strip.bins, 'bin count');
  assert.equal(strip.labels.length, ids.length, 'label count');
  const keys = strip.bins.map((b) => b.key);
  assert.deepEqual([...keys].sort(), keys, 'bins ascending');
  assert.ok(strip.bins.every((b) => b.days >= 28 && b.days <= 31), 'days per month');
});

test('trend: slope of a rising series is positive, and the word follows the flat threshold', () => {
  assert.ok(Math.abs(trendSlope([1, 2, 3, 4]) - 1) < 1e-9, 'slope of 1 per month');
  assert.equal(trendWord(trendSlope([1, 2, 3, 4])), 'rising', 'rising');
  assert.equal(trendWord(trendSlope([4, 3, 2, 1])), 'falling', 'falling');
  assert.equal(trendWord(trendSlope([2, 2, 2, 2])), 'flat', 'flat');
});

// Planted series, 30 days per month. The rising series goes from 4 to 8 counts: a least-squares slope of 0.39 counts
// per month (below the old count threshold of 0.5, so the old code read it as flat) and 0.013 density per month.
test('T3 row trend uses density: planted rising, falling and flat series give up, down and flat', () => {
  const bins = Array.from({ length: 12 }, () => ({ days: 30 }));
  const rising = [4, 4, 5, 5, 5, 6, 6, 7, 7, 7, 8, 8];
  assert.equal(rowTrend(bins, rising), 'rising', 'rising');
  assert.equal(rowTrend(bins, [...rising].reverse()), 'falling', 'falling');
  assert.equal(rowTrend(bins, Array(12).fill(9)), 'flat', 'flat');
});

test('mood and presence map into the colour bins 1 to 7', () => {
  for (let score = 1; score <= 5; score++) {
    const bin = moodBin(score);
    assert.ok(bin >= 1 && bin <= viewSettings.diverging.colorBins, `mood ${score} -> bin ${bin}`);
  }
  assert.ok(moodBin(1) < moodBin(5), 'awful is a lower bin than yay!');
  assert.equal(presenceBin(1), viewSettings.diverging.colorBins, 'present is the top bin');
  assert.equal(presenceBin(0), 1, 'absent is the lowest bin');
});

test('rolling share: no observed days, or a window of 0, gives an empty series instead of throwing (4e.0.3)', () => {
  const id = labelIdOf(data, 'Calm M+');
  const none = { days: [], labels: data.labels };
  assert.deepEqual(buildRollingData(none, [id], 30).series, [], 'no observed days');
  assert.deepEqual(buildRollingData(data, [id], 0).series, [], 'window 0');
});
