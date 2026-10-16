// Flag functions on toy data (D7): true, false and null cases. A flag that cannot be null by design has no null case;
// run.js sets null outside the top-K, and the engine test checks that.
import { test, assert } from '../core/harness.js';
import { prepare } from '../core/stats/prepare.js';
import { outcomeMasks, exposedCounts } from '../core/stats/cell-counts.js';
import { rateStats } from '../core/stats/rate.js';
import { timeSplitFails } from '../core/stats/timesplit.js';
import {
  lowSampleFlag, shortWindowFlag, failsFdrFlag, newLabelFlag, highAutocorrelationFlag, lowCompletenessFlag,
  directionAmbiguityFlag,
} from '../core/stats/flags.js';
import { defaultSettings } from '../core/settings.js';
import { stats } from '../config/stats.js';

const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
const LONG_DAYS = 200;
const HALF = 100;
const SPACING = 4;

// Days 0 to n-1, all observed and complete. Label 0 is the exposure, label 1 the outcome.
function daysOf(n, exposed, outcome) {
  const e = new Set(exposed);
  const o = new Set(outcome);
  const days = [];
  for (let t = 0; t < n; t += 1) {
    const labels = [];
    if (e.has(t)) labels.push(0);
    if (o.has(t)) labels.push(1);
    const date = new Date(Date.UTC(2022, 0, 1 + t)).toISOString().slice(0, 10);
    days.push({ day: t, date, labels, entryCount: 1, moods: [] });
  }
  return { labels: [{ id: 0, text: 'E' }, { id: 1, text: 'O' }], moodNames: [], entries: [], days };
}

// Toy 1 from stats-toy.test.js: at window 2 the exposed days give rr 1.2.
const toy1 = () => prepare({ data: daysOf(10, [1, 4, 7], [2, 3, 5, 8]), settings: defaultSettings() });

test('lowSampleFlag: true below flagLowSample exposed days, false at the threshold', () => {
  assert.equal(lowSampleFlag(stats.flagLowSample - 1, stats), true, 'one below');
  assert.equal(lowSampleFlag(stats.flagLowSample, stats), false, 'at the threshold');
});

test('shortWindowFlag: true at shortWindowDays, false one day longer', () => {
  assert.equal(shortWindowFlag(stats.shortWindowDays, stats), true, 'at the limit');
  assert.equal(shortWindowFlag(stats.shortWindowDays + 1, stats), false, 'one longer');
});

test('failsFdrFlag: false below alpha, true at alpha and when q is null', () => {
  assert.equal(failsFdrFlag(stats.alpha / 2, stats), false, 'below alpha');
  assert.equal(failsFdrFlag(stats.alpha, stats), true, 'at alpha');
  assert.equal(failsFdrFlag(null, stats), true, 'null q');
});

test('newLabelFlag: true when one label is young, false when both are old, false at exactly newLabelDays', () => {
  const n = stats.newLabelDays + 20;
  const old = range(0, n - 1);
  const young = daysOf(n, old, [5, 9]);
  assert.equal(newLabelFlag(prepare({ data: young, settings: defaultSettings() }), 0, 1, stats), true, 'young outcome');
  const both = daysOf(n, old, old);
  assert.equal(newLabelFlag(prepare({ data: both, settings: defaultSettings() }), 0, 1, stats), false, 'both old');
  const edge = daysOf(n, old, range(0, stats.newLabelDays));
  assert.equal(newLabelFlag(prepare({ data: edge, settings: defaultSettings() }), 0, 1, stats), false, 'span equals newLabelDays');
});

test('highAutocorrelationFlag: null without a placebo, false below the placebo alpha, true at or above it', () => {
  assert.equal(highAutocorrelationFlag(null, stats), null, 'no placebo');
  assert.equal(highAutocorrelationFlag(stats.placebo.alpha / 2, stats), false, 'below');
  assert.equal(highAutocorrelationFlag(stats.placebo.alpha, stats), true, 'at alpha');
});

test('lowCompletenessFlag: false when no day is removed, true when the exposed days are all low-coverage, true for rr null', () => {
  const p = toy1();
  const m = outcomeMasks(p, 1, 2, stats.minWindowCoverage);
  const c = exposedCounts(p, 0, m);
  const rr = rateStats(c.k, c.n, m.K, m.N).rr;
  const clean = { ...p, lowComp: new Uint8Array(p.n) };
  assert.equal(lowCompletenessFlag(clean, 0, m, rr, stats), false, 'nothing removed');
  const lowComp = new Uint8Array(p.n);
  for (const t of [1, 4, 7]) lowComp[t] = 1;
  assert.equal(lowCompletenessFlag({ ...p, lowComp }, 0, m, rr, stats), true, 'exposed days removed');
  assert.equal(lowCompletenessFlag(clean, 0, m, null, stats), true, 'rr null');
});

test('timeSplitFails: false when both halves carry the effect, true when the second half has no exposure', () => {
  const exposedAll = range(0, LONG_DAYS - 1).filter((t) => t % SPACING === 0);
  const both = daysOf(LONG_DAYS, exposedAll, exposedAll.map((t) => t + 1));
  const pBoth = prepare({ data: both, settings: defaultSettings() });
  const mBoth = outcomeMasks(pBoth, 1, 1, stats.minWindowCoverage);
  const cBoth = exposedCounts(pBoth, 0, mBoth);
  const rrBoth = rateStats(cBoth.k, cBoth.n, mBoth.K, mBoth.N).rr;
  assert.equal(timeSplitFails(pBoth, 0, mBoth, rrBoth, stats), false, 'effect in both halves');

  const firstOnly = exposedAll.filter((t) => t < HALF);
  const early = daysOf(LONG_DAYS, firstOnly, firstOnly.map((t) => t + 1));
  const pEarly = prepare({ data: early, settings: defaultSettings() });
  const mEarly = outcomeMasks(pEarly, 1, 1, stats.minWindowCoverage);
  const cEarly = exposedCounts(pEarly, 0, mEarly);
  const rrEarly = rateStats(cEarly.k, cEarly.n, mEarly.K, mEarly.N).rr;
  assert.equal(timeSplitFails(pEarly, 0, mEarly, rrEarly, stats), true, 'effect in the first half only');
});

test('directionAmbiguityFlag: true when the reverse cell is significant in the same direction', () => {
  const c = { q: 0.01, rates: { rr: 2 } };
  assert.equal(directionAmbiguityFlag(c, { q: 0.01, rates: { rr: 3 } }, stats), true, 'same direction');
  assert.equal(directionAmbiguityFlag(c, { q: 0.01, rates: { rr: 0.5 } }, stats), false, 'opposite direction');
  assert.equal(directionAmbiguityFlag(c, { q: 0.2, rates: { rr: 3 } }, stats), false, 'reverse not significant');
  assert.equal(directionAmbiguityFlag(c, undefined, stats), false, 'no reverse cell');
  assert.equal(directionAmbiguityFlag({ q: null, rates: { rr: 2 } }, { q: 0.01, rates: { rr: 3 } }, stats), null, 'no q');
});
