// Plain-language scan text (phase 4c, 4c.0b; Node, pure). Hand cases for describeRow and the plain summary, the
// coverage of flags and windows, the banned-words rule over the default texts, and labels that look like object keys
// or markup. Expected wording comes from config; the cases check the placeholders and the rules, not the prose.
import { test, assert } from '../core/harness.js';
import { describeRow, plainSummary, verdictKind } from '../core/scan-text.js';
import { formatNumber } from '../core/format.js';
import { stats } from '../config/stats.js';
import { windows } from '../config/windows.js';
import { flags } from '../config/flags.js';

const ui = stats.ui;
const LABELS = [{ id: 0, text: 'Alcohol' }, { id: 1, text: 'Headache' }];
const FAMILY = 1234;
const META = {
  family: FAMILY, cellsTested: 9000, discoveries: 0, discoveriesLongRuns: 0,
  up: 0, down: 0, noDirection: 0, byWindow: windows.map(() => 0), untested: 0,
};
const FALSE_FLAGS = Object.fromEntries(flags.map((f) => [f.id, false]));
const NULL_FLAGS = Object.fromEntries(flags.map((f) => [f.id, null]));
const BANNED = /rate ratio|FDR|\bq\s|placebo|p-value|significant|stratified|Mantel|autocorrelation/i;

function row(over = {}) {
  return {
    exposure: 0, outcome: 1, window: '1w', n: 61, k: 27, K: 0, N: 0,
    rate: 0.45, base: 0.16, rr: 2.8, diff: 0.29, rrAdj: 1.96, p: 0.2, pFisher: 0.2, q: null,
    placeboP: null, placeboPercentile: null, longRuns: false, flags: NULL_FLAGS, ...over,
  };
}

function describe(over, labels = LABELS) {
  return describeRow(row(over), labels, windows, META, stats, 1);
}

// Every string a default card can show for a row, so the rules can be checked over all of them.
function allStrings(d) {
  return [d.head, d.effect, d.verdict, d.shift ?? '', d.technical, ...d.warnings.flatMap((w) => [w.name, w.text])];
}

test('example row (n 61, rate ratio 1.96, difference 0.29, q and placebo null): fail, plain effect, technical line says not kept and not run', () => {
  const d = describe({ flags: NULL_FLAGS, longRuns: false });
  assert.equal(d.verdictKind, 'fail', 'kind');
  assert.ok(d.effect.includes('On the 61 days you logged "Alcohol", "Headache" was logged'), `effect: ${d.effect}`);
  assert.ok(d.effect.includes('on 45% of them'), `rate percent: ${d.effect}`);
  assert.ok(d.effect.includes('On all days the usual figure is 16%.'), `base percent: ${d.effect}`);
  assert.ok(d.effect.includes('about 2.0 times the usual rate'), `ratio: ${d.effect}`);
  assert.equal(d.shift, null, 'shift line without a placebo p');
  assert.ok(d.technical.includes('q (false-alarm rate after the correction for many comparisons) not kept (too weak)'), d.technical);
  assert.ok(d.technical.includes('shift-test p') && d.technical.endsWith('not run'), d.technical);
  assert.equal(d.verdict, ui.plain.verdict.fail.replace('{family}', formatNumber(FAMILY)), 'fail text');
});

test('q 0.01 and no flag: pass, with the pass text and the 5 in 100 figure', () => {
  const d = describe({ q: 0.01, flags: FALSE_FLAGS });
  assert.equal(d.verdictKind, 'pass', 'kind');
  assert.ok(d.verdict.includes('Passed the check for chance.'), d.verdict);
  assert.ok(d.verdict.includes('at most about 5 in 100'), d.verdict);
  assert.deepEqual(d.warnings, [], 'warnings');
});

test('q 0.01 and one flag (lowSample): pass-warnings, one warning with its pill name and explanation', () => {
  const d = describe({ q: 0.01, flags: { ...FALSE_FLAGS, lowSample: true } });
  assert.equal(d.verdictKind, 'pass-warnings', 'kind');
  assert.deepEqual(d.warnings, [{ id: 'lowSample', name: ui.pillNames.lowSample, text: ui.flagExplain.lowSample }], 'warnings');
});

test('failsFdr is not a warning: q 0.01 with failsFdr true is still a pass', () => {
  const d = describe({ q: 0.01, flags: { ...FALSE_FLAGS, failsFdr: true } });
  assert.equal(d.verdictKind, 'pass', 'kind');
  assert.deepEqual(d.warnings, [], 'warnings');
});

test('a long-run label marks a passing row as pass-warnings with the long-run warning', () => {
  const d = describe({ q: 0.01, flags: FALSE_FLAGS, longRuns: true });
  assert.equal(d.verdictKind, 'pass-warnings', 'kind');
  assert.deepEqual(d.warnings.map((w) => [w.id, w.name]), [['longRuns', ui.longRunPill]], 'warnings');
});

test('q at or above alpha, or null, is fail', () => {
  assert.equal(verdictKind(row({ q: 0.2 }), stats), 'fail', 'q 0.2');
  assert.equal(verdictKind(row({ q: stats.alpha }), stats), 'fail', 'q equal to alpha');
  assert.equal(verdictKind(row({ q: null }), stats), 'fail', 'q null');
});

test('rate ratio 0.5 reads as less often than usual', () => {
  const d = describe({ rrAdj: 0.5 });
  assert.ok(d.effect.includes('That is only about 0.5 times the usual rate (less often than usual).'), d.effect);
});

test('rate ratio 1.02 reads as about the usual rate', () => {
  const d = describe({ rrAdj: 1.02 });
  assert.ok(d.effect.endsWith('That is about the usual rate.'), d.effect);
});

test('null rate, base and ratio: fallback sentences, and no NaN, null or undefined in any output string', () => {
  const d = describe({ n: null, rate: null, base: null, rrAdj: null, diff: null, q: null, placeboP: null, rr: null });
  assert.equal(d.effect, [ui.plain.noRate, ui.plain.noBase, ui.plain.noRatio].join(' '), 'fallback effect');
  for (const text of allStrings(d)) {
    assert.ok(!/NaN|null|undefined/.test(text), `bad text: ${text}`);
  }
});

test('placebo p 0.007 reads as 0.7% in the shift line, and 0.007 on the technical line', () => {
  const d = describe({ placeboP: 0.007 });
  assert.ok(d.shift && d.shift.includes('appeared in 0.7% of tries'), `shift: ${d.shift}`);
  assert.ok(d.technical.endsWith('0.007'), d.technical);
});

test('every flag id has a flag explanation and a pill name; longRuns has an explanation and a pill; every window has a phrase and a short label', () => {
  for (const f of flags) {
    assert.ok(typeof ui.flagExplain[f.id] === 'string' && ui.flagExplain[f.id].length > 0, `no explanation for ${f.id}`);
    assert.ok(typeof ui.pillNames[f.id] === 'string', `no pill name for ${f.id}`);
  }
  assert.ok(typeof ui.flagExplain.longRuns === 'string' && typeof ui.longRunPill === 'string', 'no longRuns text');
  for (const w of windows) {
    assert.ok(typeof ui.windowPhrases[w.id] === 'string', `no phrase for ${w.id}`);
    assert.ok(typeof ui.windowShort[w.id] === 'string', `no short label for ${w.id}`);
  }
});

test('default texts avoid the statistics words (rate ratio, FDR, q, placebo, p-value, significant, stratified, Mantel, autocorrelation)', () => {
  const defaults = [
    ...Object.values(ui.plain).flatMap((v) => (typeof v === 'string' ? [v] : Object.values(v))),
    ...Object.values(ui.windowPhrases),
    ...Object.values(ui.flagExplain),
    ...ui.howToRead,
    ui.howToTitle,
    ...Object.values(ui.plainSummary),
    ui.technical.toggle,
    ui.filter.help,
    ui.allFlagged,
    ui.sortHelp,
    ui.hideFlagged,
  ];
  const rows = [
    describe({ q: 0.01, flags: { ...FALSE_FLAGS, lowSample: true, failsTimeSplit: true, longRuns: false } }),
    describe({ q: null, flags: NULL_FLAGS, placeboP: 0.02 }),
  ];
  const summary = plainSummary({ ...META, discoveries: 3, discoveriesLongRuns: 1, up: 2, down: 1, noDirection: 0, byWindow: windows.map((_, i) => (i === 0 ? 3 : 0)) }, windows, stats);
  // Technical lines are excluded on purpose: they are the one place the statistics words may appear.
  const shown = rows.flatMap((d) => [d.head, d.effect, d.verdict, d.shift ?? '', ...d.warnings.flatMap((w) => [w.name, w.text])]);
  const all = [...defaults, ...summary, ...shown];
  const hits = all.filter((text) => BANNED.test(text));
  assert.deepEqual(hits, [], 'banned words in default texts');
});

test('the technical line and the long-run note are the only places for the statistics words', () => {
  const d = describe({ q: 0.01, flags: FALSE_FLAGS, placeboP: 0.02 });
  assert.ok(/rate ratio|q \(|shift-test p/.test(d.technical), d.technical);
  assert.ok(BANNED.test(ui.longRunNote), 'the technical note should hold the statistics words');
});

test('plain summary: counts only; zero discoveries reads as the none sentence; the caution line is always there', () => {
  const none = plainSummary(META, windows, stats);
  assert.ok(none.includes(ui.plainSummary.none), 'no-discovery sentence');
  assert.equal(none[none.length - 1], ui.plainSummary.caution, 'caution last');
  const some = plainSummary({ ...META, discoveries: 5, discoveriesLongRuns: 2, up: 3, down: 1, noDirection: 1, byWindow: windows.map((_, i) => (i === 0 ? 5 : 0)) }, windows, stats);
  assert.ok(some.some((s) => s.startsWith('5 passed the check for chance: 3 without long-run labels and 2 with them')), some.join(' | '));
  assert.ok(some.some((s) => s === 'Of the 5, 3 show the outcome more often than usual and 1 less often.'), some.join(' | '));
  assert.ok(some.some((s) => s === 'Without a direction: 1.'), some.join(' | '));
  assert.ok(some.some((s) => s === `Results by time window: ${ui.windowShort['1d']}: 5.`), some.join(' | '));
});

test('labels named __proto__ and constructor, and quotes and angle brackets, come out as plain text and change no object', () => {
  const labels = [{ id: 0, text: '__proto__' }, { id: 1, text: 'constructor' }, { id: 2, text: '<b>"x"</b>' }];
  const before = JSON.stringify(labels);
  const d = describeRow(row({ exposure: 0, outcome: 2 }), labels, windows, META, stats, 1);
  assert.ok(d.head.includes('__proto__ → <b>"x"</b>'), d.head);
  const e = describeRow(row({ exposure: 1, outcome: 0 }), labels, windows, META, stats, 2);
  assert.ok(e.head.includes('constructor → __proto__'), e.head);
  assert.equal(JSON.stringify(labels), before, 'labels changed');
  assert.equal(Object.prototype.hasOwnProperty.call(Object.prototype, 'x'), false, 'prototype changed');
  const unknown = describeRow(row({ exposure: 99 }), labels, windows, META, stats, 3);
  assert.ok(unknown.head.includes(ui.plain.unknownLabel), unknown.head);
});
