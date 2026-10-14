import { test, assert } from '../core/harness.js';
import { synth as cfg } from '../config/synth.js';
import { generate } from '../core/synth.js';
import { dayOf } from '../core/calendar.js';

const data = generate(cfg);
const single = generate({ ...cfg, timeOfDay: { ...cfg.timeOfDay, mode: 'single' } });
function idOf(text) { return data.labels.find((l) => l.text === text).id; }
function hourOf(entry) { return Math.floor(entry.minutes / 60); }

test('entries: each entry falls on its assigned day', () => {
  for (const e of data.entries) {
    assert.equal(dayOf(e.date, e.minutes, cfg.timeOfDay.dayStartMinutes), e.day, 'entry on ' + e.date + ' minute ' + e.minutes);
  }
});

test('entries: grouping by day reproduces each day label set', () => {
  const map = new Map();
  for (const e of data.entries) {
    if (!map.has(e.day)) map.set(e.day, new Set());
    for (const id of e.labels) map.get(e.day).add(id);
  }
  let daysWithLabels = 0;
  for (const d of data.days) {
    if (d.labels.length === 0) continue;
    daysWithLabels += 1;
    const set = map.get(d.date) || new Set();
    assert.equal(set.size, new Set(d.labels).size, 'label set size for ' + d.date);
    for (const id of d.labels) assert.ok(set.has(id), 'label ' + id + ' present on ' + d.date);
  }
  assert.equal(map.size, daysWithLabels, 'days with entries');
});

test('entries: screen time share in calendar hours 0 to 3 is inside the config range', () => {
  const id = idOf('Screen time H-');
  const all = data.entries.filter((e) => e.labels.includes(id));
  const night = all.filter((e) => hourOf(e) >= 0 && hourOf(e) <= 3).length;
  const share = night / all.length;
  assert.ok(share >= cfg.expect.screenNightShare[0] && share <= cfg.expect.screenNightShare[1], 'share ' + share.toFixed(3));
});

test('entries: late coffee median clock hour is between 13 and 17', () => {
  const id = idOf('Late coffee F-');
  const hours = data.entries.filter((e) => e.labels.includes(id)).map(hourOf).sort((a, b) => a - b);
  const median = hours[Math.floor(hours.length / 2)];
  assert.ok(median >= 13 && median <= 17, 'median hour ' + median);
});

test('entries: single mode puts every entry at 720 minutes', () => {
  assert.ok(single.entries.length > 0, 'single mode has entries');
  for (const e of single.entries) {
    assert.equal(e.minutes, 720, 'single mode minutes');
  }
});
