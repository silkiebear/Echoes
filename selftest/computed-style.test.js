import { test, skip, assert } from '../core/harness.js';
import { views } from '../views/index.js';
import { synth as cfg } from '../config/synth.js';
import { windows } from '../config/windows.js';
import { viewSettings } from '../config/views.js';
import { generate } from '../core/synth.js';
import { computeEchoes, buildE1Data, buildE2Data, buildE3Data } from '../core/echo-demo.js';
import { buildTimeData, buildRollingData, labelIdOf } from '../core/time-demo.js';
import { mountSvg } from '../core/svg.js';
import { buildHourGrid, buildDial } from '../core/period-demo.js';
import { buildE4Data } from '../core/event-study-demo.js';
import { buildWeekdayProfile, buildMonthProfile } from '../core/profile-demo.js';

if (typeof document === 'undefined') {
  skip('computed style: no shape or text falls back to the default black fill', 'browser only');
} else {
  test('computed style: no shape or text falls back to the default black fill', () => {
    const WIDTH = 900;
    const data = generate(cfg);
    const echoes = computeEchoes(data, windows, viewSettings.echo);
    const idOf = (text) => labelIdOf(data, text);
    const demo = {
      E1: buildE1Data(data, echoes, idOf('Late coffee F-'), [idOf('Poor sleep S-'), idOf('Alcohol H-'), idOf('Headache H-')], windows),
      E2: buildE2Data(data, idOf('Deadline W-'), idOf('Anxious M-'), viewSettings.curve),
      E3: buildE3Data(data, echoes, windows, viewSettings.ranking.maxRows),
    };
    const time = buildTimeData(data);
    const rollingIds = viewSettings.time.rolling.labels.map(idOf);
    const single = generate({ ...cfg, timeOfDay: { ...cfg.timeOfDay, mode: 'single' } });
    const dialIds = ['Late coffee F-', 'Morning run A+', 'Screen time H-'].map(idOf);

    function casesFor(view) {
      switch (view.id) {
        case 'E1': return view.variants.map((v) => ({ name: `E1 ${v.id}`, data: demo.E1, opts: { variant: v.id } }));
        case 'E2': return [{ name: 'E2', data: demo.E2, opts: {} }];
        case 'E3': return [false, true].map((hideFlagged) => ({ name: `E3 hide=${hideFlagged}`, data: demo.E3, opts: { hideFlagged } }));
        case 'T1': return view.variants.flatMap((v) => ['mood', 'label'].map((metric) => ({ name: `T1 ${v.id} ${metric}`, data: time.T1, opts: { variant: v.id, metric } })));
        case 'T2': return viewSettings.time.lanes.ranges.map((r) => ({ name: `T2 ${r.id}`, data: time.T2, opts: { range: r.id } }));
        case 'T3': return [{ name: 'T3', data: time.T3, opts: {} }];
        case 'T4': return viewSettings.time.rolling.windows.map((w) => ({ name: `T4 ${w}d`, data: buildRollingData(data, rollingIds, w), opts: {} }));
        case 'P1': return [[data, 'varied'], [single, 'single']].flatMap(([d, tag]) => [null, idOf('Late coffee F-')].map((id) => ({ name: `P1 ${tag} ${id === null ? 'all' : 'coffee'}`, data: buildHourGrid(d, id, 'count', viewSettings.time.weekStart), opts: {} })));
        case 'P2': return [[data, 'varied'], [single, 'single']].flatMap(([d, tag]) => [
          { name: `P2 a ${tag}`, data: buildDial(d, [idOf('Late coffee F-')], 24), opts: { variant: 'a' } },
          { name: `P2 b ${tag}`, data: buildDial(d, dialIds, 24), opts: { variant: 'b' } },
        ]);
        case 'E4': return [3, 7].map((w) => ({ name: `E4 ${w}d`, data: buildE4Data(data, idOf('Alcohol H-'), w), opts: {} }));
        case 'P3': return [{ name: 'P3', data: buildWeekdayProfile(data, idOf('Friends meetup P+'), viewSettings.time.weekStart), opts: {} }];
        case 'P4': return [{ name: 'P4', data: buildMonthProfile(data, idOf('Hot bath H+')), opts: {} }];
        default: return [];
      }
    }

    const failures = [];
    const original = document.documentElement.getAttribute('data-theme');
    try {
      for (const theme of ['dark', 'light']) {
        if (theme === 'dark') document.documentElement.removeAttribute('data-theme');
        else document.documentElement.setAttribute('data-theme', 'light');
        for (const view of views) {
          for (const c of casesFor(view)) {
            const svg = view.render(c.data, { ...c.opts, width: WIDTH });
            const container = document.createElement('div');
            document.body.appendChild(container);
            try {
              mountSvg(container, svg);
              for (const el of container.querySelectorAll('rect, path, polygon, circle')) {
                if (el.getAttribute('fill') === 'none') continue;
                if (getComputedStyle(el).fill === 'rgb(0, 0, 0)') {
                  failures.push(`${theme}, ${view.id}, ${c.name}, ${el.tagName}, ${el.getAttribute('class')}`);
                }
              }
              if (theme === 'dark') {
                for (const el of container.querySelectorAll('text')) {
                  if (getComputedStyle(el).fill === 'rgb(0, 0, 0)') {
                    failures.push(`${theme}, ${view.id}, ${c.name}, ${el.tagName}, ${el.getAttribute('class')}`);
                  }
                }
              }
            } finally {
              container.remove();
            }
          }
        }
      }
    } finally {
      if (original === null) document.documentElement.removeAttribute('data-theme');
      else document.documentElement.setAttribute('data-theme', original);
    }
    assert.equal(failures.length, 0, failures.slice(0, 10).join('; '));
  });
}
