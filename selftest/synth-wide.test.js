import { test, assert } from '../core/harness.js';
import { addDays } from '../core/calendar.js';
import { generateWide } from '../core/synth-wide.js';
import { statsSynth } from '../config/stats-synth.js';

const PLANTS = 8;

const cfg = statsSynth;
const seed = cfg.seed;

function presence(days, id) {
  return days.map((d) => d.labels.includes(id) ? 1 : 0);
}

// Conditional outcome rate y[t] given the prior-day (t-1) value of the exposure series x.
function priorCrossRate(x, y) {
  const yes = { n: 0, hit: 0 }; // x[t-1] == 1
  const no = { n: 0, hit: 0 }; // x[t-1] == 0
  for (let t = 1; t < x.length; t += 1) {
    if (x[t - 1] === 1) { yes.n += 1; if (y[t] === 1) yes.hit += 1; }
    else { no.n += 1; if (y[t] === 1) no.hit += 1; }
  }
  return { yes: yes.n ? yes.hit / yes.n : NaN, no: no.n ? no.hit / no.n : NaN };
}

function inRange(rate, lo, hi) {
  return rate >= lo && rate <= hi;
}

function plantDaysPerDay(out) {
  return out.days.map((d) => d.labels.filter((id) => id < PLANTS));
}

test('same seed is deterministic; different seed changes the series', () => {
  const a = generateWide(cfg, seed);
  const b = generateWide(cfg, seed);
  assert.deepEqual(a, b, 'same seed gives deep-equal output');

  const c = generateWide(cfg, seed + 1);
  const sa = a.days.map((d) => JSON.stringify(d.labels));
  const sc = c.days.map((d) => JSON.stringify(d.labels));
  assert.ok(sa.join('|') !== sc.join('|'), 'different seed changes the labels-per-day sequence');
});

test('day structure is well formed', () => {
  const out = generateWide(cfg, seed);
  assert.equal(out.days.length, cfg.days, 'one day per cfg.days');
  assert.equal(out.labels.length, PLANTS + cfg.fillerCount, 'labels = plants + fillers');

  for (let t = 0; t < out.days.length; t += 1) {
    const d = out.days[t];
    assert.equal(d.date, addDays(cfg.startDate, t), `date ${t} is the calendar day`);
    assert.equal(d.entryCount, 1, `entryCount ${t} is 1`);
    const sorted = [...d.labels].sort((x, y) => x - y);
    const unique = [...new Set(d.labels)];
    assert.deepEqual(d.labels, sorted, `labels ${t} are sorted`);
    assert.deepEqual(d.labels, unique, `labels ${t} are unique`);
    for (const id of d.labels) {
      assert.ok(id >= 0 && id < out.labels.length, `id ${id} exists in labels`);
    }
  }
});

test('adding fillers does not change the plant series', () => {
  const small = generateWide(cfg, seed, 10);
  const large = generateWide(cfg, seed, 50);
  assert.deepEqual(plantDaysPerDay(small), plantDaysPerDay(large), 'plant label sets per day are identical');
});

test('up plant rates', () => {
  const out = generateWide(cfg, seed);
  const x = presence(out.days, 0);
  const y = presence(out.days, 1);
  const pX = x.reduce((a, v) => a + v, 0) / x.length;
  const rate = priorCrossRate(x, y);
  assert.ok(inRange(pX, 0.16, 0.24), `P(up X) = ${pX}`);
  assert.ok(inRange(rate.yes, 0.50, 0.70), `P(up Y | up X) = ${rate.yes}`);
  assert.ok(inRange(rate.no, 0.07, 0.13), `P(up Y | no up X) = ${rate.no}`);
});

test('down plant rates', () => {
  const out = generateWide(cfg, seed);
  const x = presence(out.days, 2);
  const y = presence(out.days, 3);
  const pX = x.reduce((a, v) => a + v, 0) / x.length;
  const rate = priorCrossRate(x, y);
  assert.ok(inRange(pX, 0.21, 0.29), `P(down X) = ${pX}`);
  assert.ok(inRange(rate.yes, 0.00, 0.05), `P(down Y | down X) = ${rate.yes}`);
  assert.ok(inRange(rate.no, 0.16, 0.24), `P(down Y | no down X) = ${rate.no}`);
});

test('late plant turns the effect on in the second half', () => {
  const out = generateWide(cfg, seed);
  const x = presence(out.days, 4);
  const y = presence(out.days, 5);
  const cut = Math.floor(cfg.days / 2);
  let after = { n: 0, hit: 0 };
  let before = { n: 0, hit: 0 };
  for (let t = 1; t < x.length; t += 1) {
    if (x[t - 1] !== 1) continue;
    const bucket = t >= cut ? after : before;
    bucket.n += 1;
    if (y[t] === 1) bucket.hit += 1;
  }
  const afterRate = after.n ? after.hit / after.n : NaN;
  const beforeRate = before.n ? before.hit / before.n : NaN;
  assert.ok(inRange(afterRate, 0.45, 0.75), `late Y | late X after cut = ${afterRate}`);
  assert.ok(inRange(beforeRate, 0.01, 0.19), `late Y | late X before cut = ${beforeRate}`);
});

test('streak chains have the stated transition rates', () => {
  const out = generateWide(cfg, seed);
  for (const id of [6, 7]) {
    const s = presence(out.days, id);
    let prev1 = { n: 0, hit: 0 };
    let prev0 = { n: 0, hit: 0 };
    for (let t = 1; t < s.length; t += 1) {
      if (s[t - 1] === 1) { prev1.n += 1; if (s[t] === 1) prev1.hit += 1; }
      else { prev0.n += 1; if (s[t] === 1) prev0.hit += 1; }
    }
    const pStay = prev1.hit / prev1.n;
    const pStart = prev0.hit / prev0.n;
    assert.ok(inRange(pStay, 0.90, 0.99), `streak ${id} P(1|1) = ${pStay}`);
    assert.ok(inRange(pStart, 0.004, 0.04), `streak ${id} P(1|0) = ${pStart}`);
  }
});

test('mean filler labels per day matches the summed rates', () => {
  const out = generateWide(cfg, seed);
  const { baseRates } = out.meta;
  let total = 0;
  for (const d of out.days) {
    for (const id of d.labels) { if (id >= PLANTS) total += 1; }
  }
  const mean = total / out.days.length;
  const sumRates = baseRates.reduce((a, p) => a + p, 0);
  const varSum = baseRates.reduce((a, p) => a + p * (1 - p), 0);
  const std = Math.sqrt(varSum / out.days.length);
  assert.ok(Math.abs(mean - sumRates) <= 3 * std, `mean ${mean} vs sum ${sumRates} within 3 std`);
});
