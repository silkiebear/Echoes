// E views on real data: adapters (phase 4d, 4d.4; pure, Node and browser). Round trip: export text, parse, then the Echo
// scan. Methods, written before the first run: E2 lag rate = exposed days t (observed) with t + lag inside the data and
// observed, hits = the outcome on day t + lag, over the same count. E4 as in core/event-study-demo.js, on the observed
// days: an event is an observed day with the exposure and none in the previous gapDays observed days; before and after are
// outcome shares over the windows of observed days; the values are means over the events.
import { test, assert } from '../core/harness.js';
import { exportText } from '../core/synth-export.js';
import { parseExport } from '../core/export-parse.js';
import { parser } from '../config/parser.js';
import { synth } from '../config/synth.js';
import { defaultSettings } from '../core/settings.js';
import { prepare } from '../core/stats/prepare.js';
import { runScan } from '../core/stats/run.js';
import { stats } from '../config/stats.js';
import { windows } from '../config/windows.js';
import { viewSettings } from '../config/views.js';
import { explore } from '../config/explore.js';
import { toViewData } from '../core/view-data.js';
import { buildE1Real, buildE2Real, buildE4Real } from '../core/echo-real.js';
import * as diag from '../core/diag.js';
import e1View from '../views/e1-echo-matrix.js';
import e2View from '../views/e2-echo-curves.js';
import e4View from '../views/e4-before-after.js';
import { messageSvg, choiceOf } from '../core/explore-kit.js';
import { outcomesOf, outcomeOf } from '../modules/explore-echo.js';
import { textBox, overlaps, insideView, estimateWidth, wrapText } from '../core/textfit.js';
import { exploreEcho } from '../config/explore-echo.js';

const LAGS = [1, 2, 3];
// Few shuffles keep the Node test fast; the band itself is not compared with counts.
const TEST_SHUFFLES = 20;
const EVENT_TEXT = 'Late coffee F-';
const OUTCOME_TEXT = 'Poor sleep S-';

const data = parseExport(exportText(synth, {}), parser).data;
const idOf = (text) => data.labels.find((l) => l.text === text).id;
const scanOf = (d) => runScan({ data: d, settings: defaultSettings() }, { mode: 'fast', cfg: { ...stats, scanTest: 'stratified' } });

test('E1 real: each cell is the adjusted rate ratio of the scan row for the pair; a cell with no row is null', async () => {
  const scan = await scanOf(data);
  const event = idOf(EVENT_TEXT);
  const outcomes = [...new Set(scan.rows.filter((r) => r.exposure === event).map((r) => r.outcome))];
  assert.ok(outcomes.length > 0, 'the scan has rows for the event');
  const e1 = buildE1Real(scan, data.labels, windows, event, outcomes);
  let filled = 0;
  outcomes.forEach((o, i) => windows.forEach((w, j) => {
    const row = scan.rows.find((r) => r.exposure === event && r.outcome === o && r.window === w.id);
    const expected = row && Number.isFinite(row.rrAdj) ? row.rrAdj : null;
    assert.equal(e1.cells[i][j].rr, expected, `outcome ${o} window ${w.id}`);
    if (expected !== null) filled += 1;
  }));
  assert.ok(filled > 0, 'some cells have a ratio');
  assert.ok(e1.cells.some((row) => row.some((c) => c.rr === null)), 'some cells are null');
});

test('E2 real: the lag rates equal a direct count from the raw days for lags 1 to 3', () => {
  const prepared = prepare({ data, settings: defaultSettings() });
  const event = idOf(EVENT_TEXT);
  const outcome = idOf(OUTCOME_TEXT);
  const e2 = buildE2Real(prepared, event, outcome, {
    days: 3, shuffles: TEST_SHUFFLES, seed: stats.placebo.seed, labels: data.labels, statsCfg: stats,
  });
  const observed = data.days.map((d) => d.entryCount > 0);
  for (const lag of LAGS) {
    let n = 0;
    let hits = 0;
    for (let t = 0; t + lag < data.days.length; t += 1) {
      if (!observed[t] || !observed[t + lag]) continue;
      if (!data.days[t].labels.includes(event)) continue;
      n += 1;
      if (data.days[t + lag].labels.includes(outcome)) hits += 1;
    }
    const point = e2.points[lag - 1];
    assert.equal(point.day, lag, `lag ${lag} day`);
    assert.equal(point.n, n, `lag ${lag} count`);
    assert.equal(point.rate, n > 0 ? hits / n : null, `lag ${lag} rate`);
  }
});

test('E4 real: the events and the before and after shares equal a direct count on the observed days', () => {
  const view = toViewData(data, defaultSettings(), explore);
  const event = idOf('Alcohol H-');
  const days = viewSettings.eventStudy.defaultWindow;
  const e4 = buildE4Real(view, event, days);
  const obs = view.observedDays;
  const gap = viewSettings.eventStudy.gapDays;
  const has = (t, id) => obs[t].labels.includes(id);
  const events = [];
  for (let t = 0; t < obs.length; t += 1) {
    if (!has(t, event)) continue;
    let isEvent = true;
    for (let k = 1; k <= gap; k += 1) {
      if (t - k >= 0 && has(t - k, event)) {
        isEvent = false;
        break;
      }
    }
    if (isEvent && t - days >= 0 && t + days <= obs.length - 1) events.push(t);
  }
  assert.equal(e4.nEvents, events.length, 'events');
  assert.ok(e4.rows.length > 0, 'rows');
  const row = e4.rows[0];
  const outcome = data.labels.find((l) => l.text === row.outcomeLabel).id;
  let before = 0;
  let after = 0;
  for (const t of events) {
    let b = 0;
    let a = 0;
    for (let t2 = t - days; t2 <= t - 1; t2 += 1) if (has(t2, outcome)) b += 1;
    for (let t2 = t + 1; t2 <= t + days; t2 += 1) if (has(t2, outcome)) a += 1;
    before += b / days;
    after += a / days;
  }
  assert.equal(row.before, before / events.length, 'before');
  assert.equal(row.after, after / events.length, 'after');
});

test('E views real: labels named __proto__ and constructor change no object', () => {
  const labels = [{ id: 0, text: '__proto__' }, { id: 1, text: 'constructor' }, { id: 2, text: 'Other' }];
  const scan = {
    rows: [{ exposure: 0, outcome: 1, window: '1d', n: 3, rrAdj: 1.5, diff: 0.1, flags: { lowSample: true }, longRuns: false }],
    meta: {}, data: null, settings: null,
  };
  const before = JSON.stringify(Object.keys(Object.prototype));
  const e1 = buildE1Real(scan, labels, windows, 0, [1, 2]);
  assert.equal(e1.outcomes[0].label, 'constructor', 'label text kept');
  assert.equal(Object.getPrototypeOf(e1.outcomes[0]), Object.prototype, 'outcome prototype');
  assert.equal(e1.cells[0][0].rr, 1.5, 'cell ratio');
  assert.deepEqual(e1.cells[0][0].flags, ['lowSample'], 'flags');
  assert.equal(JSON.stringify(Object.keys(Object.prototype)), before, 'Object.prototype unchanged');
});

test('E views real: after a label is drawn, the diagnostics without data sections contain no label text', () => {
  const probe = 'Probe label text for the E views';
  const labels = [{ id: 0, text: probe }, { id: 1, text: 'Other' }];
  const scan = {
    rows: [{ exposure: 0, outcome: 1, window: '1d', n: 3, rrAdj: 1.5, diff: 0.1, flags: {}, longRuns: false }],
    meta: {}, data: null, settings: null,
  };
  const snapshot = diag.snapshot();
  try {
    diag.register(probe, 'label');
    const svg = e1View.render(buildE1Real(scan, labels, windows, 0, [1]), {});
    assert.ok(svg.includes('<svg'), 'drew');
    const text = diag.build({ includeData: false });
    assert.ok(!text.includes(probe), 'label text in the diagnostics');
  } finally {
    diag.restore(snapshot);
  }
});

// Message wrap (4e.0.2): every <text> of the message as an estimated box, as in view-data.test.js.
const MESSAGE_WIDTHS = [280, 320, 900];
function textBoxesOf(svg) {
  const [, width, height] = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg);
  const boxes = [];
  const re = /<text x="([^"]*)" y="([^"]*)" dy="[^"]*" class="[^"]*" text-anchor="([^"]*)" font-size="([^"]*)">([\s\S]*?)<\/text>/g;
  // The markup escapes quotes and ampersands; decode them so each character is measured once, as drawn.
  const decode = (s) => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  for (const m of svg.matchAll(re)) boxes.push(textBox(Number(m[1]), Number(m[2]), decode(m[5]), Number(m[4]), m[3]));
  return { width: Number(width), height: Number(height), boxes };
}

// Every string under a config object, found by walking the objects (so a new message key is covered without a list).
function stringsOf(value, out = []) {
  if (typeof value === 'string') out.push(value);
  else if (value && typeof value === 'object') for (const v of Object.values(value)) stringsOf(v, out);
  return out;
}

test('messageSvg: a 200-character message and a 60-character unbroken word wrap inside the view at 280, 320 and 900 px, no overlap', () => {
  const long = Array.from({ length: 25 }, () => 'message').join(' ');
  const unbroken = 'x'.repeat(60);
  const failures = [];
  for (const text of [long, unbroken, ...stringsOf(explore.ui), ...stringsOf(exploreEcho.ui)]) {
    for (const width of MESSAGE_WIDTHS) {
      const { width: w, height: h, boxes } = textBoxesOf(messageSvg(width, text, 'message'));
      if (w !== width) failures.push(`${text.slice(0, 20)} at ${width}: viewBox width ${w}`);
      boxes.forEach((box, i) => {
        if (!insideView(box, w, h)) failures.push(`${text.slice(0, 20)} at ${width}: line ${i} outside the view`);
        for (const other of boxes.slice(i + 1)) if (overlaps(box, other)) failures.push(`${text.slice(0, 20)} at ${width}: lines overlap`);
      });
    }
  }
  assert.deepEqual(failures.slice(0, 5), [], 'message layout');
});



// E1, E2 and E4 texts wrap (phase 4e): long labels and captions give several lines, and every text box is inside its view
// at 280, 320 and 900 px. Fabricated data, so the width is the only input that changes.
const LONG_LABEL = 'Late coffee and a long outcome name that has to wrap over several lines in the card';
test('E1, E2 and E4 texts wrap: long labels and captions stay inside their view at 280, 320 and 900 px', () => {
  // The unbroken 60-character labels have no space: they must be cut, not run off the view (phase 4e, long-word fix).
  const UNBROKEN = 'x'.repeat(60);
  const e1 = {
    outcomes: [{ id: 0, label: LONG_LABEL }, { id: 1, label: 'Short' }, { id: 2, label: UNBROKEN }],
    windows: windows.map((w) => ({ id: w.id, label: w.label })),
    cells: [0, 1, 2].map(() => windows.map(() => ({ rr: 1.2, diff: 0.1, nExposed: 9, flags: [], forced: [] }))),
  };
  const e2 = {
    eventLabel: UNBROKEN,
    outcomeLabel: LONG_LABEL,
    baseline: 0.2,
    points: Array.from({ length: 14 }, (_, i) => ({ day: i + 1, rate: 0.2, lo: 0.1, hi: 0.3, n: 5 })),
  };
  const e4 = {
    eventLabel: LONG_LABEL,
    windowDays: 3,
    nEvents: 12,
    rows: [
      { outcomeLabel: LONG_LABEL, before: 0.1, after: 0.2, diff: 0.1, flags: ['lowSample'] },
      { outcomeLabel: 'Short', before: 0.2, after: 0.1, diff: -0.1, flags: ['lowSample'] },
      { outcomeLabel: UNBROKEN, before: 0.2, after: 0.1, diff: -0.1, flags: [] },
    ],
  };
  const failures = [];
  for (const width of WIDTHS_E) {
    const svgs = { E1: e1View.render(e1, { width }), E2: e2View.render(e2, { width }), E4: e4View.render(e4, { width }) };
    for (const [name, svg] of Object.entries(svgs)) {
      const { width: w, height: h, boxes } = textBoxesOf(svg);
      boxes.forEach((box, i) => {
        if (!insideView(box, w, h)) failures.push(`${name} at ${width}: text ${i} outside the view`);
      });
    }
    const titleLines = (svgs.E2.match(/class="t" text-anchor="start"/g) || []).length;
    if (titleLines < 2) failures.push(`E2 at ${width}: the long title is ${titleLines} line(s)`);
  }
  assert.deepEqual(failures.slice(0, 5), [], 'texts inside the views');
});
const WIDTHS_E = [280, 320, 900];

// Uniform label rule (4f.2). Choices are kept per card with the selection they were made for; names that are also
// Object.prototype keys (constructor) are never looked up as choices.
test('choices: the default is the fallback; a choice of the same selection holds; a changed selection clears it', () => {
  assert.equal(choiceOf({ selection: [2, 3] }, 'T1', 2), 2, 'default');
  const kept = { selection: [2, 3], exploreChoice: { selection: '2,3', choices: { T1: 3 } } };
  assert.equal(choiceOf(kept, 'T1', 2), 3, 'kept for the same selection');
  const changed = { selection: [2, 5], exploreChoice: { selection: '2,3', choices: { T1: 3 } } };
  assert.equal(choiceOf(changed, 'T1', 2), 2, 'cleared when the selection changed');
  const notSelected = { selection: [2, 3], exploreChoice: { selection: '2,3', choices: { T1: 9 } } };
  assert.equal(choiceOf(notSelected, 'T1', 2), 2, 'an id that is not selected never draws');
  const proto = { selection: [2], exploreChoice: { selection: '2', choices: {} } };
  assert.equal(choiceOf(proto, 'constructor', 2), 2, 'Object.prototype names are not choices');
});

test('outcomes: E1 and E4 take the other selected labels in selection order, at most maxOutcomes', () => {
  assert.deepEqual(outcomesOf([4, 1, 7], 4), [1, 7], 'three selected, event first');
  assert.deepEqual(outcomesOf([0, 1], 1), [0], 'event is the second label');
  const many = Array.from({ length: exploreEcho.maxOutcomes + 5 }, (_, i) => i + 1);
  assert.equal(outcomesOf([0, ...many], 0).length, exploreEcho.maxOutcomes, 'cap');
});

test('outcome: E2 takes its Outcome select when that is another selected label; otherwise the first other label', () => {
  const ids = [2, 5, 7];
  assert.equal(outcomeOf({ selection: ids }, 2, ids), 5, 'default: the second selected label');
  const chosen = { selection: ids, exploreChoice: { selection: '2,5,7', choices: { 'E2-outcome': 7 } } };
  assert.equal(outcomeOf(chosen, 2, ids), 7, 'the Outcome select');
  const same = { selection: ids, exploreChoice: { selection: '2,5,7', choices: { 'E2-outcome': 2 } } };
  assert.equal(outcomeOf(same, 2, ids), 5, 'an outcome equal to the event falls back');
});

test('wrapText: a word wider than the line is cut into pieces that fit, no character lost; normal text wraps as before', () => {
  const word = 'x'.repeat(60);
  const lines = wrapText(word, 12, 264);
  assert.ok(lines.length > 1, 'more than one line');
  assert.ok(lines.every((line) => estimateWidth(line, 12) <= 264), 'each piece fits');
  assert.equal(lines.join(''), word, 'no character lost');
  assert.deepEqual(wrapText('one two three four', 12, 60), ['one two', 'three', 'four'], 'whole words, greedy');
  assert.deepEqual(wrapText('', 12, 60), [], 'empty text');
});
