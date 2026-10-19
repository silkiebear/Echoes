import { test, assert } from '../core/harness.js';
import { views } from '../views/index.js';
import { synth as cfg } from '../config/synth.js';
import { windows } from '../config/windows.js';
import { viewSettings } from '../config/views.js';
import { generate } from '../core/synth.js';
import { computeEchoes, buildE1Data, buildE2Data, buildE3Data } from '../core/echo-demo.js';
import { buildTimeData, buildRollingData, labelIdOf } from '../core/time-demo.js';
import { textBox, overlaps, insideView } from '../core/textfit.js';
import { buildHourGrid, buildDial } from '../core/period-demo.js';
import { buildE4Data } from '../core/event-study-demo.js';
import { buildWeekdayProfile, buildMonthProfile } from '../core/profile-demo.js';

// Text-fit guard over the generated markup. It reads the known format from core/svg.js (svgText, svgDoc) and
// uses the estimated boxes from core/textfit.js. It catches overflow and overlap, not pixel-level problems.
const WIDTHS = [320, 900];
// M2 mood setup: a long name that wraps, and twelve moods (the most a user is likely to have).
const M2_LONG = {
  moods: [
    { name: 'yay!', order: 1, color: '#3f9e6b' },
    { name: 'a long mood name that has to wrap over several lines', order: 2, color: '#c4553f' },
  ],
};
const M2_TWELVE = {
  moods: Array.from({ length: 12 }, (_, i) => ({ name: `mood number ${i + 1}`, order: i + 1, color: '#3f9e6b' })),
};
const T = viewSettings.time;
const pad = viewSettings.text.outlinePad;

const data = generate(cfg);
const echoes = computeEchoes(data, windows, viewSettings.echo);
const idOf = (text) => labelIdOf(data, text);
const demo = {
  E1: buildE1Data(data, echoes, idOf('Late coffee F-'), [idOf('Poor sleep S-'), idOf('Alcohol H-'), idOf('Headache H-')], windows),
  E2: buildE2Data(data, idOf('Deadline W-'), idOf('Anxious M-'), viewSettings.curve),
  E3: buildE3Data(data, echoes, windows, viewSettings.ranking.maxRows),
};
const time = buildTimeData(data);
const rollingIds = T.rolling.labels.map(idOf);
// Periodic views also run on single-timestamp data, which triggers the low-diversity pill.
const single = generate({ ...cfg, timeOfDay: { ...cfg.timeOfDay, mode: 'single' } });
const dialIds = ['Late coffee F-', 'Morning run A+', 'Screen time H-'].map(idOf);

// Each case is one render: the data plus the options a gallery control would pass.
function casesFor(view) {
  switch (view.id) {
    case 'E1': return view.variants.map((v) => ({ name: `E1 ${v.id}`, data: demo.E1, opts: { variant: v.id } }));
    case 'E2': return [{ name: 'E2', data: demo.E2, opts: {} }];
    case 'E3': return [false, true].map((hideFlagged) => ({ name: `E3 hide=${hideFlagged}`, data: demo.E3, opts: { hideFlagged } }));
    case 'T1': return view.variants.flatMap((v) => ['mood', 'label'].map((metric) => ({ name: `T1 ${v.id} ${metric}`, data: time.T1, opts: { variant: v.id, metric } })));
    case 'T2': return T.lanes.ranges.map((r) => ({ name: `T2 ${r.id}`, data: time.T2, opts: { range: r.id } }));
    case 'T3': return [{ name: 'T3', data: time.T3, opts: {} }];
    case 'T4': return T.rolling.windows.map((w) => ({ name: `T4 ${w}d`, data: buildRollingData(data, rollingIds, w), opts: {} }));
    case 'P1': return [[data, 'varied'], [single, 'single']].flatMap(([d, tag]) => [null, idOf('Late coffee F-')].map((id) => ({
      name: `P1 ${tag} ${id === null ? 'all' : 'coffee'}`, data: buildHourGrid(d, id, 'count', T.weekStart), opts: {},
    })));
    case 'P2': return [[data, 'varied'], [single, 'single']].flatMap(([d, tag]) => [
      { name: `P2 a ${tag}`, data: buildDial(d, [idOf('Late coffee F-')], 24), opts: { variant: 'a' } },
      { name: `P2 b ${tag}`, data: buildDial(d, dialIds, 24), opts: { variant: 'b' } },
    ]);
    case 'E4': return [3, 7].map((w) => ({ name: `E4 ${w}d`, data: buildE4Data(data, idOf('Alcohol H-'), w), opts: {} }));
    case 'P3': return [{ name: 'P3', data: buildWeekdayProfile(data, idOf('Friends meetup P+'), T.weekStart), opts: {} }];
    case 'P4': return [{ name: 'P4', data: buildMonthProfile(data, idOf('Hot bath H+')), opts: {} }];
    case 'M2': return [
      { name: 'M2 long name', data: M2_LONG, opts: {} },
      { name: 'M2 12 moods', data: M2_TWELVE, opts: {} },
    ];
    default: return [];
  }
}

function attr(tag, name) {
  const m = new RegExp(`\\s${name}="([^"]*)"`).exec(tag);
  return m ? m[1] : null;
}

function decode(s) {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
}

// Reads the viewBox size, every <text> as an estimated box, and every flag-outline rect.
function parse(svg) {
  const open = /<svg\b[^>]*>/.exec(svg)[0];
  const [, , width, height] = attr(open, 'viewBox').split(/\s+/).map(Number);
  const texts = [];
  for (const m of svg.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g)) {
    const tag = m[1];
    const box = textBox(
      Number(attr(tag, 'x')),
      Number(attr(tag, 'y')),
      decode(m[2]),
      Number(attr(tag, 'font-size')),
      attr(tag, 'text-anchor') || 'start',
    );
    texts.push({ box, text: decode(m[2]) });
  }
  const outlines = [];
  for (const m of svg.matchAll(/<rect\b([^>]*?)\/?>/g)) {
    if (attr(m[1], 'class') !== 'flag-outline') continue;
    const x = Number(attr(m[1], 'x'));
    const y = Number(attr(m[1], 'y'));
    outlines.push({ x, y, x1: x + Number(attr(m[1], 'width')), y1: y + Number(attr(m[1], 'height')) });
  }
  return { width, height, texts, outlines };
}

// A text is fine when it lies entirely inside the outline, shrunk by the pad, or entirely outside it, grown by the pad.
function outlineProblems(parsed) {
  const problems = [];
  for (const o of parsed.outlines) {
    for (const t of parsed.texts) {
      const b = t.box;
      const inside = b.x0 >= o.x + pad && b.x1 <= o.x1 - pad && b.y0 >= o.y + pad && b.y1 <= o.y1 - pad;
      const outside = b.x1 <= o.x - pad || b.x0 >= o.x1 + pad || b.y1 <= o.y - pad || b.y0 >= o.y1 + pad;
      if (!inside && !outside) problems.push(`"${t.text}" is within ${pad}px of an outline`);
    }
  }
  return problems;
}

function checkSvg(svg) {
  const parsed = parse(svg);
  const problems = [];
  if (parsed.texts.length === 0) problems.push('no text parsed (the test would be empty)');
  for (const t of parsed.texts) {
    if (!insideView(t.box, parsed.width, parsed.height)) problems.push(`"${t.text}" outside the viewBox`);
  }
  for (let i = 0; i < parsed.texts.length; i++) {
    for (let j = i + 1; j < parsed.texts.length; j++) {
      const a = parsed.texts[i];
      const b = parsed.texts[j];
      if (overlaps(a.box, b.box)) problems.push(`"${a.text}" overlaps "${b.text}"`);
    }
  }
  return problems.concat(outlineProblems(parsed));
}

test('every view, variant and width: text inside the viewBox, no overlapping text, outlines padded', () => {
  const failures = [];
  for (const view of views) {
    for (const c of casesFor(view)) {
      for (const width of WIDTHS) {
        const svg = view.render(c.data, { ...c.opts, width });
        for (const problem of checkSvg(svg)) failures.push(`${c.name} @${width}: ${problem}`);
      }
    }
  }
  assert.equal(failures.length, 0, failures.slice(0, 8).join('; '));
});

test('every view has at least one case (no view is skipped by the layout test)', () => {
  for (const view of views) assert.ok(casesFor(view).length > 0, `${view.id} has no cases`);
});
