import { test, assert } from '../core/harness.js';
import { views } from '../views/index.js';
import { synth as cfg } from '../config/synth.js';
import { windows } from '../config/windows.js';
import { viewSettings } from '../config/views.js';
import { generate } from '../core/synth.js';
import { computeEchoes, buildE1Data, buildE2Data, buildE3Data } from '../core/echo-demo.js';
import { buildTimeData } from '../core/time-demo.js';
import { buildHourGrid, buildDial } from '../core/period-demo.js';
import { buildE4Data } from '../core/event-study-demo.js';
import { buildWeekdayProfile, buildMonthProfile } from '../core/profile-demo.js';

const data = generate(cfg);
const echoes = computeEchoes(data, windows, viewSettings.echo);
const idOf = (text) => data.labels.find((l) => l.text === text).id;
const demoData = {
  E1: buildE1Data(data, echoes, idOf('Late coffee F-'), [idOf('Poor sleep S-'), idOf('Alcohol H-'), idOf('Headache B-')], windows),
  E2: buildE2Data(data, idOf('Deadline W-'), idOf('Anxious M-'), viewSettings.curve),
  E3: buildE3Data(data, echoes, windows, viewSettings.ranking.maxRows),
  ...buildTimeData(data),
  P1: buildHourGrid(data, null, 'count', viewSettings.time.weekStart),
  P2: buildDial(data, [idOf('Late coffee F-')], 24),
  E4: buildE4Data(data, idOf('Alcohol H-'), 3),
  P3: buildWeekdayProfile(data, idOf('Friends meetup P+'), viewSettings.time.weekStart),
  P4: buildMonthProfile(data, idOf('Hot bath B+')),
};
const HOSTILE = '<b>&"\'';
const hostileRows = {
  rows: [{
    rank: 1, exposureLabel: HOSTILE, outcomeLabel: 'Outcome', windowLabel: '1d',
    rr: 2, diff: 0.1, nExposed: 50, flags: ['shortWindow'], forced: [],
  }],
};

function viewById(id) {
  return views.find((v) => v.id === id);
}

// Views without variants (P1) have no variant to pass.
function variantOf(view) {
  return view.variants.length ? view.variants[0].id : undefined;
}

test('every view and variant renders an svg with a viewBox from demo data', () => {
  for (const view of views) {
    for (const variant of view.variants) {
      const svg = view.render(demoData[view.id], { variant: variant.id, hideFlagged: false });
      assert.ok(svg.startsWith('<svg'), `${view.id}/${variant.id} does not start with <svg`);
      assert.ok(svg.includes('viewBox="'), `${view.id}/${variant.id} has no viewBox`);
    }
  }
});

test('rendered markup has no script, external URL, or inline handlers', () => {
  for (const view of views) {
    const svg = view.render(demoData[view.id], { variant: variantOf(view), hideFlagged: false });
    for (const bad of ['<script', 'http', 'onload=', 'onclick=']) {
      assert.ok(!svg.includes(bad), `${view.id} contains ${bad}`);
    }
  }
});

test('colours are CSS classes, never inline hex', () => {
  for (const view of views) {
    const svg = view.render(demoData[view.id], { variant: variantOf(view), hideFlagged: false });
    assert.ok(!/#[0-9a-f]{3,8}\b/i.test(svg), `${view.id} contains a hex colour`);
  }
});

test('a label with markup characters appears only in escaped form', () => {
  const svg = viewById('E3').render(hostileRows, { hideFlagged: false });
  assert.ok(svg.includes('&lt;b&gt;&amp;&quot;&#39;'), 'escaped form missing');
  assert.ok(!svg.includes('<b>'), 'raw markup present');
});

test('flagged cells get an outline and flagged rows get a pill', () => {
  const e1 = viewById('E1').render(demoData.E1, { variant: 'a' });
  assert.ok(e1.includes('class="flag-outline"'), 'no outline on flagged cells');
  const e3 = viewById('E3').render(demoData.E3, { hideFlagged: false });
  assert.ok(e3.includes('class="pill"'), 'no pill on flagged rows');
});

test('hideFlagged removes flagged rows', () => {
  const shown = viewById('E3').render(demoData.E3, { hideFlagged: false });
  const hidden = viewById('E3').render(demoData.E3, { hideFlagged: true });
  assert.ok(shown.includes('class="flag-outline"'), 'fixture should have flagged rows');
  assert.ok(!hidden.includes('class="flag-outline"'), 'flagged row still shown');
  assert.ok(hidden.length < shown.length, 'hidden output should be shorter');
});

test('a null cell renders n/a', () => {
  const svg = viewById('E1').render(demoData.E1, { variant: 'a' });
  assert.ok(svg.includes('n/a'), 'n/a missing');
});

test('E2 subtitle states the demo band', () => {
  const svg = viewById('E2').render(demoData.E2, {});
  assert.ok(svg.includes('demo band'), 'demo band wording missing');
});

test('output is deterministic', () => {
  for (const view of views) {
    const opts = { variant: variantOf(view), hideFlagged: false };
    assert.equal(view.render(demoData[view.id], opts), view.render(demoData[view.id], opts), `${view.id} differs between renders`);
  }
});
