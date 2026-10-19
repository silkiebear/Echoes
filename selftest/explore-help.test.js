// Explore help and "In this chart" sentences (phase 4e, 4e.1; pure, Node and browser). Checks the help texts (four
// non-empty parts within explore.help.maxChars, every card id covered, no statistics word), the live sentences against
// direct counts from the raw days after the export round trip, label texts "__proto__" and "constructor", and that the
// diagnostics without data sections hold no label text.
import { test, assert } from '../core/harness.js';
import { exploreHelp } from '../config/explore-help.js';
import { explore } from '../config/explore.js';
import { exploreEcho } from '../config/explore-echo.js';
import { viewSettings } from '../config/views.js';
import { synth } from '../config/synth.js';
import { parser } from '../config/parser.js';
import { stats } from '../config/stats.js';
import { windows } from '../config/windows.js';
import { exportText } from '../core/synth-export.js';
import { parseExport } from '../core/export-parse.js';
import { defaultSettings } from '../core/settings.js';
import { toViewData } from '../core/view-data.js';
import { prepare } from '../core/stats/prepare.js';
import { runScan } from '../core/stats/run.js';
import { buildE1Real, buildE2Real, buildE4Real } from '../core/echo-real.js';
import { buildYearData, buildStripData, buildRollingData, buildLanesData, lastYear } from '../core/time-demo.js';
import { buildWeekdayProfile, buildMonthProfile } from '../core/profile-demo.js';
import { buildHourGrid, buildDial } from '../core/period-demo.js';
import { liveSentence } from '../core/explore-live.js';
import * as diag from '../core/diag.js';
import * as selectMod from '../modules/explore-select.js';
import * as timeMod from '../modules/explore-time.js';
import * as periodicMod from '../modules/explore-periodic.js';
import * as echoMod from '../modules/explore-echo.js';
import * as helpMod from '../modules/explore-help.js';

const EVENT_TEXT = 'Late coffee F-';
const OUTCOME_TEXT = 'Poor sleep S-';
const LAGS_DAYS = 3;
const TEST_SHUFFLES = 20;
const MAX_CHARS = explore.help.maxChars;
// Words that must not appear in the default help or live texts (SPEC 15, phase 4c.2 rule), whole words, any case.
const BANNED = /\b(rate ratio|FDR|q|placebo|p-value|significant|stratified|Mantel|autocorrelation)\b/i;
const PARTS = ['what', 'how', 'numbers', 'care'];

const raw = parseExport(exportText(synth, {}), parser).data;
const settings = defaultSettings();
const view = toViewData(raw, settings, explore);
const obs = { labels: view.labels, days: view.observedDays };
const T = viewSettings.time;
const idOf = (text) => raw.labels.find((l) => l.text === text).id;
const pct = (x) => `${(x * 100).toFixed(exploreHelp.live.percentDigits)}%`;

// Counting method (written before the first run). Every direct count below uses only the raw parsed days (date, labels,
// entryCount), never a builder. A day is observed when entryCount > 0. T1: days of the year with the label. T3: observed
// days per calendar month with the label; months shown are the last T.strip.bins months with observed days; the busiest
// count is the largest of them. P3 and P4: observed days with the label (N) and observed days (M); the largest count of
// label days per weekday (UTC weekday of the date) or per month (month of the date). E1: scan rows for the event, for the
// outcomes shown, with a finite adjusted ratio. E2 lag 1: observed day t with the event and observed day t+1 (both
// observed), counting the outcome on t+1; the usual rate is the outcome's share of all observed days. E4: events are
// observed days with the event, with no event in the gap days before, with a full window on both sides.
function directCounts(id) {
  const observed = raw.days.filter((d) => d.entryCount > 0);
  return { observed, onDays: observed.filter((d) => d.labels.includes(id)) };
}

test('help: every card has four parts, none empty, none longer than explore.help.maxChars', () => {
  const failures = [];
  for (const [id, entry] of Object.entries(exploreHelp.cards)) {
    for (const part of PARTS) {
      const text = entry[part];
      if (typeof text !== 'string' || text.trim().length === 0) failures.push(`${id}.${part} is empty`);
      else if (text.length > MAX_CHARS) failures.push(`${id}.${part} has ${text.length} characters, limit ${MAX_CHARS}`);
    }
    if (entry.id !== id) failures.push(`${id} has id ${entry.id}`);
  }
  assert.deepEqual(failures, [], 'help parts');
});

test('help: every card id the Explore modules export has help, and every help entry has a module', async () => {
  const exported = [selectMod, timeMod, periodicMod, echoMod, helpMod].flatMap((m) => m.cardIds);
  assert.deepEqual(exported.filter((id) => exploreHelp.cards[id] === undefined), [], 'card ids without help');
  assert.deepEqual(Object.keys(exploreHelp.cards).filter((id) => !exported.includes(id)), [], 'help without a card');
  assert.equal(new Set(exported).size, exported.length, 'card ids are unique');
});

// The statistics words may stay on the page (phase 4e decision): the card notes and captions that use them must be
// explained, and the glossary is where each one is explained. So the help prose, the captions and the live caption must
// not use them; the glossary may.
test('help: no statistics word in the help prose, the captions, the toggle or the live caption', () => {
  const texts = [
    ...Object.values(exploreHelp.cards).flatMap((e) => PARTS.map((p) => e[p])),
    ...Object.values(exploreHelp.captions),
    exploreHelp.live.caption,
    exploreHelp.ui.toggle,
    exploreHelp.ui.glossaryLink,
  ];
  const hits = texts.filter((t) => BANNED.test(t));
  assert.deepEqual(hits, [], 'banned words');
});

test('help: each statistics term the cards show has a glossary entry that explains it', () => {
  const terms = exploreHelp.glossary.terms.map((t) => t.term);
  for (const term of ['Rate ratio', 'Placebo band']) {
    const entry = exploreHelp.glossary.terms.find((t) => t.term === term);
    assert.ok(entry, `glossary term ${term}`);
    assert.ok(entry.text.length > 0 && entry.text.length <= MAX_CHARS, `${term} explanation length`);
  }
  assert.equal(new Set(terms).size, terms.length, 'glossary terms are distinct');
});

test('live: every sentence of the default synthetic data has no statistics word and never throws (T2, T4, P1, P2 included)', async () => {
  const ev = idOf(EVENT_TEXT);
  const { observed } = directCounts(ev);
  const sentences = [
    liveSentence('T2', buildLanesData(view, [ev, idOf(OUTCOME_TEXT)])),
    liveSentence('T4', buildRollingData(obs, [ev], T.rolling.defaultWindow), [EVENT_TEXT]),
    liveSentence('P1', buildHourGrid(view, null, 'count', T.weekStart)),
    liveSentence('P2', buildDial(view, [ev], explore.periodic.dialBins)),
  ];
  for (const s of sentences) {
    assert.ok(typeof s === 'string' && s.length > 0, `a sentence: ${s}`);
    assert.ok(!BANNED.test(s), `banned word in: ${s}`);
  }
  assert.ok(observed.length > 0, 'observed days exist');
});

test('live: T1, T3, P3, P4 sentences equal direct counts from the raw days after the round trip', () => {
  const ev = idOf(EVENT_TEXT);
  const { observed, onDays } = directCounts(ev);
  const failures = [];
  const expect = (name, got, want) => {
    if (got !== want) failures.push(`${name}: got ${got}, want ${want}`);
  };

  const year = lastYear(view);
  const t1Days = raw.days.filter((d) => d.date.startsWith(`${year}-`) && d.labels.includes(ev)).length;
  expect('T1', liveSentence('T1', buildYearData(view, year, ev), [EVENT_TEXT]), `${EVENT_TEXT} is on ${t1Days} days in ${year}.`);

  const monthCount = new Map();
  for (const d of observed) {
    const key = d.date.slice(0, 7);
    if (!monthCount.has(key)) monthCount.set(key, 0);
    if (d.labels.includes(ev)) monthCount.set(key, monthCount.get(key) + 1);
  }
  const shown = [...monthCount.keys()].sort().slice(-T.strip.bins);
  const busiest = Math.max(...shown.map((k) => monthCount.get(k)));
  const t3 = liveSentence('T3', buildStripData(obs, [ev], T.strip.bins), [EVENT_TEXT]);
  const t3m = /is shown over (\d+) months; the busiest month is .+ with (\d+) days\./.exec(t3);
  if (!t3m) failures.push(`T3 sentence not matched: ${t3}`);
  else {
    expect('T3 months', Number(t3m[1]), shown.length);
    expect('T3 busiest', Number(t3m[2]), busiest);
  }

  const dayOfWeek = new Array(7).fill(0);
  for (const d of onDays) dayOfWeek[new Date(`${d.date}T00:00:00Z`).getUTCDay()] += 1;
  const p3 = /was logged on (\d+) of (\d+) observed days; the highest weekday is .+ with (\d+) days\./.exec(
    liveSentence('P3', buildWeekdayProfile(obs, ev, T.weekStart), [EVENT_TEXT]),
  );
  if (!p3) failures.push('P3 sentence not matched');
  else {
    expect('P3 present', Number(p3[1]), onDays.length);
    expect('P3 observed', Number(p3[2]), observed.length);
    expect('P3 highest weekday', Number(p3[3]), Math.max(...dayOfWeek));
  }

  const byMonth = new Array(12).fill(0);
  for (const d of onDays) byMonth[Number(d.date.slice(5, 7)) - 1] += 1;
  const p4 = /was logged on (\d+) of (\d+) observed days; the highest month is .+ with (\d+) days\./.exec(
    liveSentence('P4', buildMonthProfile(obs, ev), [EVENT_TEXT]),
  );
  if (!p4) failures.push('P4 sentence not matched');
  else {
    expect('P4 present', Number(p4[1]), onDays.length);
    expect('P4 observed', Number(p4[2]), observed.length);
    expect('P4 highest month', Number(p4[3]), Math.max(...byMonth));
  }
  assert.deepEqual(failures, [], 'direct counts');
});

test('live: E1, E2 and E4 sentences equal direct counts from the raw days and the scan rows', async () => {
  const ev = idOf(EVENT_TEXT);
  const out = idOf(OUTCOME_TEXT);
  const failures = [];
  const expect = (name, got, want) => {
    if (got !== want) failures.push(`${name}: got ${got}, want ${want}`);
  };

  const scan = await runScan({ data: raw, settings }, { mode: 'fast', cfg: { ...stats, scanTest: 'stratified' } });
  const outcomes = [...new Set(scan.rows.filter((r) => r.exposure === ev).map((r) => r.outcome))].slice(0, exploreEcho.e1MaxOutcomes);
  const e1 = buildE1Real(scan, raw.labels, windows, ev, outcomes);
  let kept = 0;
  for (const o of outcomes) {
    for (const w of windows) {
      const row = scan.rows.find((r) => r.exposure === ev && r.outcome === o && r.window === w.id);
      if (row && Number.isFinite(row.rrAdj)) kept += 1;
    }
  }
  const e1s = /has a scan row in (\d+) of (\d+) cells/.exec(liveSentence('E1', e1, [EVENT_TEXT]));
  if (!e1s) failures.push('E1 sentence not matched');
  else {
    expect('E1 kept', Number(e1s[1]), kept);
    expect('E1 total', Number(e1s[2]), outcomes.length * windows.length);
  }

  const { observed } = directCounts(ev);
  const observedFlag = raw.days.map((d) => d.entryCount > 0);
  let n = 0;
  let hits = 0;
  for (let t = 0; t + 1 < raw.days.length; t += 1) {
    if (!observedFlag[t] || !observedFlag[t + 1]) continue;
    if (!raw.days[t].labels.includes(ev)) continue;
    n += 1;
    if (raw.days[t + 1].labels.includes(out)) hits += 1;
  }
  const outcomeDays = observed.filter((d) => d.labels.includes(out)).length;
  const usual = outcomeDays / observed.length;
  const prepared = prepare({ data: raw, settings });
  const e2 = buildE2Real(prepared, ev, out, { days: LAGS_DAYS, shuffles: TEST_SHUFFLES, seed: stats.placebo.seed, labels: raw.labels, statsCfg: stats });
  const e2s = liveSentence('E2', e2, [EVENT_TEXT, OUTCOME_TEXT]);
  const want = n === 0
    ? `${EVENT_TEXT} to ${OUTCOME_TEXT}: no observed day one day after the event.`
    : `${EVENT_TEXT} to ${OUTCOME_TEXT}: one day after the event the outcome rate is ${pct(hits / n)}, against a usual ${pct(usual)}.`;
  expect('E2', e2s, want);

  const days = viewSettings.eventStudy.defaultWindow;
  const gap = viewSettings.eventStudy.gapDays;
  const has = (t, id) => view.observedDays[t].labels.includes(id);
  const obsLen = view.observedDays.length;
  let events = 0;
  for (let t = 0; t < obsLen; t += 1) {
    if (!has(t, ev)) continue;
    let isEvent = true;
    for (let k = 1; k <= gap; k += 1) {
      if (t - k >= 0 && has(t - k, ev)) {
        isEvent = false;
        break;
      }
    }
    if (isEvent && t - days >= 0 && t + days <= obsLen - 1) events += 1;
  }
  const e4 = buildE4Real(view, ev, days);
  const e4s = /has (\d+) events; the largest change is for/.exec(liveSentence('E4', e4, [EVENT_TEXT]));
  if (!e4s) failures.push('E4 sentence not matched');
  else expect('E4 events', Number(e4s[1]), events);
  assert.deepEqual(failures, [], 'direct counts');
});

test('live: labels named __proto__ and constructor appear as text and change no object', () => {
  const before = JSON.stringify(Object.keys(Object.prototype));
  const protoRow = { year: 2024, days: [{ present: 1 }] };
  const s1 = liveSentence('T1', protoRow, ['__proto__']);
  const s2 = liveSentence('P3', { title: 'constructor', rows: [{ label: 'Monday', rate: 1, n: 2 }] }, ['constructor']);
  assert.ok(s1.includes('__proto__ is on 1 days'), s1);
  assert.ok(s2.includes('constructor was logged on 2 of 2'), s2);
  assert.equal(Object.getPrototypeOf(protoRow), Object.prototype, 'row prototype');
  assert.equal(JSON.stringify(Object.keys(Object.prototype)), before, 'Object.prototype unchanged');
});

test('live: after a card sentence with a registered label, the diagnostics without data sections contain no label text', () => {
  const probe = 'Probe label text for the help';
  const snapshot = diag.snapshot();
  try {
    diag.register(probe, 'label');
    const s = liveSentence('T1', { year: 2024, days: [{ present: 1 }] }, [probe]);
    assert.ok(s.includes(probe), 'the sentence holds the label for the page');
    const text = diag.build({ includeData: false });
    assert.ok(!text.includes(probe), 'label text in the diagnostics');
  } finally {
    diag.restore(snapshot);
  }
});
