// Adapter from parsed data to the builder shape (phase 4c, 4c.2; pure, Node and browser). Hand cases for the weekday
// (from the assigned date), the day mood (mean of the entries' scores, rounded to the nearest whole score with halves
// up), days without a usable mood, and the error for a missing argument. Phase 4d (4d.0.2): the mood scale from the
// settings and the T1 and T2 views with and without it (kept here because views.test.js and layout.test.js are not on
// the 4d allowed list).
import { test, assert } from '../core/harness.js';
import { toViewData, moodScale } from '../core/view-data.js';
import { weekdayOf } from '../core/calendar.js';
import { explore } from '../config/explore.js';
import { viewSettings } from '../config/views.js';
import { settingsConfig } from '../config/settings.js';
import { synth } from '../config/synth.js';
import { parser } from '../config/parser.js';
import { exportText } from '../core/synth-export.js';
import { parseExport } from '../core/export-parse.js';
import { defaultSettings } from '../core/settings.js';
import { buildYearData, buildLanesData } from '../core/time-demo.js';
import { textBox, insideView } from '../core/textfit.js';
import t1 from '../views/t1-year-grid.js';
import t2 from '../views/t2-lanes.js';
import { scaleFill } from '../views/diverge.js';

// Three moods: A is best (score 3), B 2, C 1 (score = count - order + 1).
const SETTINGS = { moods: [{ name: 'A', order: 1 }, { name: 'B', order: 2 }, { name: 'C', order: 3 }] };

// Entries get the date of their day, no labels and no time unless the case sets them (parsed entries always have both).
function dataWith(days, entries) {
  return {
    labels: [{ id: 0, text: 'L0' }],
    moodNames: ['A', 'B', 'C', 'Zed'],
    days: days.map((date, day) => ({ day, date, labels: [0], entryCount: 0, moods: [] })),
    entries: entries.map((e) => ({ date: days[e.day], minutes: null, labels: [], ...e })),
  };
}

test('toViewData: weekday comes from the assigned date; labels keep their ids and texts', () => {
  const data = dataWith(['2024-01-01', '2024-01-07'], []);
  const view = toViewData(data, SETTINGS, explore);
  assert.equal(view.days[0].weekday, 1, 'Monday is 1 (getDay convention)');
  assert.equal(view.days[1].weekday, 0, 'Sunday is 0');
  assert.equal(view.days[0].weekday, weekdayOf('2024-01-01'), 'same as calendar.weekdayOf');
  assert.deepEqual(view.labels, [{ id: 0, text: 'L0' }], 'labels');
  assert.deepEqual(view.days[0].labels, [0], 'day labels');
});

test('toViewData: day mood is the rounded mean of the entries; halves round up; unscored days are null', () => {
  const days = ['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05', '2024-01-06'];
  const entries = [
    { day: 0, moods: [0] }, { day: 0, moods: [1] }, // A 3 and B 2: mean 2.5 rounds to 3
    { day: 1, moods: [0] }, { day: 1, moods: [2] }, // A 3 and C 1: mean 2
    { day: 2, moods: [1] }, { day: 2, moods: [2] }, // B 2 and C 1: mean 1.5 rounds to 2
    { day: 3, moods: [3] }, // Zed is not a mood in settings: no score
    { day: 5, moods: [] }, // an entry without a mood
  ];
  const view = toViewData(dataWith(days, entries), SETTINGS, explore);
  assert.deepEqual(view.days.map((d) => d.mood), [3, 2, 2, null, null, null], 'day moods');
});

test('toViewData: a day with no entries has a null mood and keeps its date', () => {
  const view = toViewData(dataWith(['2024-02-10'], []), SETTINGS, explore);
  assert.equal(view.days[0].mood, null, 'mood');
  assert.equal(view.days[0].date, '2024-02-10', 'date');
});

test('toViewData: a missing argument is refused and the error names it, not any label text', () => {
  assert.throws(() => toViewData(null, SETTINGS, explore), 'argument data', 'missing data');
  assert.throws(() => toViewData(dataWith(['2024-01-01'], []), { moods: null }, explore), 'argument settings', 'missing moods');
  assert.throws(() => toViewData(dataWith(['2024-01-01'], []), SETTINGS, {}), 'argument cfg.dayMood', 'missing rounding');
});

test('toViewData: observed days are the days with an entry; gap days stay in the calendar list only', () => {
  const days = ['2024-01-01', '2024-01-02', '2024-01-03'];
  const data = dataWith(days, [{ day: 0, date: '2024-01-01', minutes: 600, labels: [0], moods: [] }]);
  data.days[2].entryCount = 0;
  data.days[0].entryCount = 1;
  data.days[1].entryCount = 0;
  const view = toViewData(data, SETTINGS, explore);
  assert.equal(view.days.length, 3, 'calendar days');
  assert.deepEqual(view.observedDays.map((d) => d.date), ['2024-01-01'], 'observed days');
});

test('toViewData: entries without a time are left out of the time views and counted', () => {
  const data = dataWith(['2024-01-01'], [
    { day: 0, date: '2024-01-01', minutes: 615, labels: [0], moods: [] },
    { day: 0, date: '2024-01-01', minutes: null, labels: [0], moods: [] },
  ]);
  const view = toViewData(data, SETTINGS, explore);
  assert.deepEqual(view.entries, [{ date: '2024-01-01', minutes: 615, labels: [0] }], 'timed entries');
  assert.equal(view.untimedCount, 1, 'untimed count');
});

test('moodScale: default presets give five entries, best first, scores 5 to 1, and the preset colours', () => {
  const scale = moodScale(defaultSettings());
  assert.deepEqual(scale.map((e) => e.name), ['yay!', 'good', 'meh', 'bad', 'awful'], 'names best first');
  assert.deepEqual(scale.map((e) => e.score), [5, 4, 3, 2, 1], 'scores');
  for (const e of scale) {
    const preset = settingsConfig.moodPresets.find((m) => m.name === e.name);
    assert.equal(e.color, preset.color, `${e.name} colour`);
  }
});

test('moodScale: a custom list of three moods takes its order from the settings', () => {
  const scale = moodScale({ moods: [
    { name: 'A', order: 1, color: '#111111' },
    { name: 'B', order: 2, color: '#222222' },
    { name: 'C', order: 3, color: '#333333' },
  ] });
  assert.deepEqual(scale, [
    { score: 3, name: 'A', color: '#111111' },
    { score: 2, name: 'B', color: '#222222' },
    { score: 1, name: 'C', color: '#333333' },
  ], 'scale');
});

test('scaleFill looks up by score: a reversed scale gives the same fills (4e.0.1)', () => {
  const scale = moodScale(defaultSettings());
  const reversed = [...scale].reverse();
  for (let score = 1; score <= 5; score++) {
    assert.equal(scaleFill(score, reversed), scaleFill(score, scale), `score ${score}`);
  }
  assert.equal(scaleFill(5, scale), settingsConfig.moodPresets.find((m) => m.name === 'yay!').color, 'yay! is score 5');
  assert.equal(scaleFill(9, scale), explore.mood.fallbackColor, 'a score with no entry gets the fallback');
});

test('moodScale: a colour that is not #rrggbb gets the config fallback colour', () => {
  const scale = moodScale({ moods: [
    { name: 'A', order: 1, color: 'red' },
    { name: 'B', order: 2, color: '#12345' },
    { name: 'C', order: 3, color: '#gggggg' },
  ] });
  assert.deepEqual(scale.map((e) => e.color), [explore.mood.fallbackColor, explore.mood.fallbackColor, explore.mood.fallbackColor], 'colours');
});

test('moodScale: __proto__ and constructor as mood names change no object', () => {
  const settings = { moods: [
    { name: '__proto__', order: 1, color: '#111111' },
    { name: 'constructor', order: 2, color: '#222222' },
  ] };
  const before = JSON.stringify(settings);
  const scale = moodScale(settings);
  assert.deepEqual(scale, [
    { score: 2, name: '__proto__', color: '#111111' },
    { score: 1, name: 'constructor', color: '#222222' },
  ], 'entries');
  assert.equal(JSON.stringify(settings), before, 'settings unchanged');
  assert.equal(Object.getPrototypeOf(scale[0]), Object.prototype, 'entry prototype');
});

// Mood scale views (4d.0.2). The fingerprints (length and FNV-1a 32-bit hash) were taken from the markup of T1 and
// T2 before opts.moodScale existed, on the default synthetic export with the default presets.
// Phase 4e, user request: the no-scale key now shows the default preset names (yay! to awful, best first), so the five
// mood fingerprints and T2 were recomputed (tools\scratch\fingerprints.mjs, same inputs). The label fingerprints did
// not change, because they have no mood key.
function fnv(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

const BEFORE = {
  'T1 a mood 320': [25600, 'e7730bbe'],
  'T1 b mood 320': [26559, '761570d7'],
  'T1 a label 320': [25090, '12177470'],
  'T2 320': [36947, 'c09ac5c8'],
  'T1 a mood 900': [26421, 'ecae3625'],
  'T1 b mood 900': [26604, 'be11c274'],
  'T1 a label 900': [25905, 'e75b3587'],
  'T2 900': [66882, 'a0f9dd5c'],
};
const WIDTHS = [320, 900];
const exported = parseExport(exportText(synth, {}), parser).data;
const demoView = toViewData(exported, defaultSettings(), explore);
const YEAR = Number(demoView.days[demoView.days.length - 1].date.slice(0, 4));
const PALETTE = settingsConfig.moodPalette.slice(0, viewSettings.time.moodNames.length);

// Settings from a name list, best first: the first name is order 1, so it has the top score (phase 4e).
function scaleOf(names) {
  return { moods: names.map((name, i) => ({ name, order: i + 1, color: PALETTE[i] })) };
}

test('T1 and T2 without opts.moodScale print the demo-scale markup they printed before 4d.0.2', () => {
  const got = {};
  for (const width of WIDTHS) {
    for (const variant of ['a', 'b']) {
      got[`T1 ${variant} mood ${width}`] = t1.render(buildYearData(demoView, YEAR, 0), { variant, metric: 'mood', width });
    }
    got[`T1 a label ${width}`] = t1.render(buildYearData(demoView, YEAR, 0), { variant: 'a', metric: 'label', width });
    got[`T2 ${width}`] = t2.render(buildLanesData(demoView, [0, 1]), { range: viewSettings.time.lanes.defaultRange, width });
  }
  const changed = Object.keys(BEFORE).filter((name) => got[name].length !== BEFORE[name][0] || fnv(got[name]) !== BEFORE[name][1]);
  assert.deepEqual(changed, [], 'changed outputs');
  for (const svg of Object.values(got)) assert.ok(!svg.includes('style="fill'), 'no style fill without the scale');
});

test('T1 with opts.moodScale: names as text in the key, stored colours on the days, null days keep class bin-0', () => {
  const settings = scaleOf(viewSettings.time.moodNames);
  const view = toViewData(exported, settings, explore);
  const scale = moodScale(settings);
  const data = buildYearData(view, YEAR, 0);
  const svg = t1.render(data, { variant: 'a', metric: 'mood', width: 900, moodScale: scale });
  const failures = [];
  for (const e of scale) {
    if (!svg.includes(`>${e.name}</text>`)) failures.push(`name ${e.name} is not text in the key`);
  }
  const filled = (svg.match(/style="fill: #/g) || []).length;
  const withMood = data.days.filter((d) => d.mood !== null).length;
  if (filled !== withMood + scale.length) failures.push(`${filled} filled shapes, expected ${withMood} days and ${scale.length} swatches`);
  const nullDays = data.days.filter((d) => d.mood === null).length;
  const nullClass = (svg.match(/class="bin-0"/g) || []).length;
  if (nullClass !== nullDays) failures.push(`${nullClass} null cells, expected ${nullDays}`);
  if (/undefined|NaN/.test(svg)) failures.push('undefined or NaN in the markup');
  assert.deepEqual(failures, [], 'T1 with the scale');
});

test('T2 with opts.moodScale: the band takes stored colours, names as text under the axis', () => {
  const settings = scaleOf(viewSettings.time.moodNames);
  const scale = moodScale(settings);
  const view = toViewData(exported, settings, explore);
  const svg = t2.render(buildLanesData(view, [0, 1]), { range: viewSettings.time.lanes.defaultRange, width: 900, moodScale: scale });
  const failures = [];
  for (const e of scale) {
    if (!svg.includes(`>${e.name}</text>`)) failures.push(`name ${e.name} is not text`);
  }
  const stored = new Set(scale.map((e) => e.color));
  for (const m of svg.matchAll(/style="fill: (#[0-9a-fA-F]{6})"/g)) {
    if (!stored.has(m[1])) failures.push(`colour ${m[1]} is not a stored colour`);
  }
  assert.deepEqual(failures, [], 'T2 with the scale');
});

// The scale key wraps to the next row when the width is short (4e.0.1): every swatch inside the view at 320 and 900 px,
// and the swatches in the order best first (yay! at the top left).
test('T1 and T2 with the default scale: swatches inside the view and best first at 320 and 900 px', () => {
  const settings = defaultSettings();
  const scale = moodScale(settings);
  const view = toViewData(exported, settings, explore);
  const failures = [];
  for (const width of WIDTHS) {
    const svgs = {
      T1: t1.render(buildYearData(view, YEAR, 0), { variant: 'a', metric: 'mood', width, moodScale: scale }),
      T2: t2.render(buildLanesData(view, [0, 1]), { range: viewSettings.time.lanes.defaultRange, width, moodScale: scale }),
    };
    for (const [name, svg] of Object.entries(svgs)) {
      const [, w] = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg);
      const sw = viewSettings.time.moodSwatch;
      const swatches = [...svg.matchAll(new RegExp(`<rect style="fill: [^"]*" x="([\\d.]+)" y="[\\d.]+" width="${sw}" height="${sw}"/>`, 'g'))];
      if (swatches.length !== scale.length) failures.push(`${name} at ${width}: ${swatches.length} swatches`);
      for (const m of swatches) {
        if (Number(m[1]) + sw > Number(w) + viewSettings.text.tolerance) failures.push(`${name} at ${width}: swatch outside`);
      }
      const names = [...svg.matchAll(/class="t-muted" text-anchor="start" font-size="[^"]*">([^<]*)<\/text>/g)].map((m) => m[1]);
      const keyNames = names.filter((n) => scale.some((e) => e.name === n));
      if (JSON.stringify(keyNames) !== JSON.stringify(scale.map((e) => e.name))) failures.push(`${name} at ${width}: names not best first`);
    }
  }
  assert.deepEqual(failures, [], 'key layout');
});

test('mood names with markup characters are escaped in the key', () => {
  const settings = scaleOf(['<i>awful</i>', 'bad', 'meh', 'good', 'yay!']);
  const svg = t1.render(buildYearData(toViewData(exported, settings, explore), YEAR, 0), { variant: 'a', metric: 'mood', width: 900, moodScale: moodScale(settings) });
  assert.ok(svg.includes('&lt;i&gt;awful&lt;/i&gt;'), 'escaped name');
  assert.ok(!svg.includes('<i>'), 'no raw markup');
});

// Every <text> as an estimated box (core/textfit.js) and the viewBox size of its svg.
function boxesOf(svg) {
  const [, width, height] = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg);
  const boxes = [];
  const re = /<text x="([^"]*)" y="([^"]*)" dy="[^"]*" class="[^"]*" text-anchor="([^"]*)" font-size="([^"]*)">([\s\S]*?)<\/text>/g;
  for (const m of svg.matchAll(re)) {
    boxes.push({ text: m[5], box: textBox(Number(m[1]), Number(m[2]), m[5], Number(m[4]), m[3]) });
  }
  return { width: Number(width), height: Number(height), boxes };
}

test('T1 and T2 with a 5-entry scale and a long mood name: every text inside its view at 320 and 900 px', () => {
  const settings = scaleOf(['a long mood name that has to wrap over several lines', 'bad', 'meh', 'good', 'yay!']);
  const scale = moodScale(settings);
  const view = toViewData(exported, settings, explore);
  const failures = [];
  for (const width of WIDTHS) {
    const svgs = {
      'T1 a': t1.render(buildYearData(view, YEAR, 0), { variant: 'a', metric: 'mood', width, moodScale: scale }),
      'T1 b': t1.render(buildYearData(view, YEAR, 0), { variant: 'b', metric: 'mood', width, moodScale: scale }),
      T2: t2.render(buildLanesData(view, [0, 1]), { range: viewSettings.time.lanes.defaultRange, width, moodScale: scale }),
    };
    for (const [name, svg] of Object.entries(svgs)) {
      const { width: w, height: h, boxes } = boxesOf(svg);
      for (const { text, box } of boxes) {
        if (!insideView(box, w, h)) failures.push(`${name} at ${width}: "${text}" outside the view`);
      }
    }
  }
  assert.deepEqual(failures, [], 'text outside the view');
});
