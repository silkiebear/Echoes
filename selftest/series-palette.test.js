// Series palette (phase 4g.3). The T4 lines use up to eight series: each has one colour, one marker and one class pair.
// Node checks the palette rules (distance, contrast, length) with planted bad values, and the rendered T4 SVG: no class
// with "undefined", the legend key and the line share a colour, and the eight series differ in colour and marker.
// The browser reads the computed --series-N custom properties and the computed fill and stroke of the rendered SVG.
import { test, skip, assert } from '../core/harness.js';
import { seriesPalette } from '../config/palette.js';
import { explore } from '../config/explore.js';
import { viewSettings } from '../config/views.js';
import { minPairwiseDeltaE } from '../core/color-lab.js';
import { contrastRatio, parseHex } from '../core/color.js';
import t4 from '../views/t4-rolling.js';

// This test's surfaces: the card surface of tokens.css in each theme.
const SURFACE = { dark: '#1e2129', light: '#ffffff' };
const SAMPLE_POINTS = 12;
const SAMPLE_MOD = 5;
const SAMPLE_SHARE = 10;
const WRAP_COUNT = 9; // one more than the palette, so the ninth series must wrap to the first colour

function paletteFailures(colours, surface) {
  const out = [];
  if (colours.length < explore.selection.max) out.push(`length ${colours.length} < selection.max ${explore.selection.max}`);
  const d = minPairwiseDeltaE(colours);
  if (d < seriesPalette.seriesMinDeltaE) out.push(`min pairwise deltaE ${d.toFixed(2)} < ${seriesPalette.seriesMinDeltaE}`);
  for (const c of colours) {
    const r = contrastRatio(c, surface);
    if (r < seriesPalette.seriesMinContrast) out.push(`${c} contrast ${r.toFixed(2)} < ${seriesPalette.seriesMinContrast}`);
  }
  return out;
}

function syntheticData(n) {
  const series = [];
  for (let k = 0; k < n; k += 1) {
    const values = [];
    for (let i = 0; i < SAMPLE_POINTS; i += 1) values.push(((i + k) % SAMPLE_MOD) / SAMPLE_SHARE);
    series.push({ id: `L${k}`, text: `Label ${k}`, values });
  }
  return { window: viewSettings.time.rolling.defaultWindow, startDate: '2026-01-01', endDate: '2026-01-12', series };
}

// The legend key (role key) or the line (role line) of series k, as its markup.
function svgGroup(svg, k, role) {
  const m = svg.match(new RegExp(`<g data-series="${k}" data-role="${role}"[^>]*>([\\s\\S]*?)</g>`));
  return m ? m[0] : null;
}

test('series palette: both themes pass the length, distance and contrast rules', () => {
  for (const theme of ['dark', 'light']) {
    assert.deepEqual(paletteFailures(seriesPalette[theme], SURFACE[theme]), [], theme);
    assert.ok(seriesPalette[theme].length === seriesPalette.count, `${theme} has ${seriesPalette[theme].length} colours, count is ${seriesPalette.count}`);
  }
});

test('series palette: a planted near-identical pair fails the distance rule', () => {
  const planted = seriesPalette.dark.slice();
  planted[1] = '#209bf7';
  const failures = paletteFailures(planted, SURFACE.dark);
  assert.ok(failures.some((f) => /deltaE/.test(f)), `expected a deltaE failure, got ${failures.join('; ')}`);
});

test('series palette: a planted low-contrast colour fails the contrast rule', () => {
  const planted = seriesPalette.dark.slice();
  planted[0] = '#1f2a36';
  const failures = paletteFailures(planted, SURFACE.dark);
  assert.ok(failures.some((f) => /#1f2a36 contrast/.test(f)), `expected a contrast failure, got ${failures.join('; ')}`);
});

test('series palette: a planted short palette fails the length rule', () => {
  const failures = paletteFailures(seriesPalette.dark.slice(0, explore.selection.max - 1), SURFACE.dark);
  assert.ok(failures.some((f) => /length/.test(f)), `expected a length failure, got ${failures.join('; ')}`);
});

test('T4 with eight labels: no class contains undefined; key and line share a colour; eight colours and markers', () => {
  const svg = t4.render(syntheticData(explore.selection.max), { width: viewSettings.defaultWidth });
  const undefinedClasses = svg.match(/class="[^"]*undefined[^"]*"/g) || [];
  assert.ok(undefinedClasses.length === 0, `classes with undefined: ${undefinedClasses.join(' ')}`);
  const colourNs = [];
  const markers = [];
  for (let k = 0; k < explore.selection.max; k += 1) {
    const key = svgGroup(svg, k, 'key');
    const line = svgGroup(svg, k, 'line');
    assert.ok(key !== null, `no legend key for series ${k}`);
    assert.ok(line !== null, `no line for series ${k}`);
    const keyN = key.match(/class="sf?-(\d+)"/)[1];
    const lineN = line.match(/class="line s-(\d+)"/)[1];
    assert.ok(keyN === lineN, `series ${k}: legend colour ${keyN} is not the line colour ${lineN}`);
    colourNs.push(keyN);
    markers.push(key.match(/data-marker="([^"]+)"/)[1]);
    const marks = line.split(`data-mark="${k}"`).length - 1;
    assert.ok(marks === Math.min(viewSettings.time.rolling.perLine, SAMPLE_POINTS), `series ${k}: ${marks} markers`);
  }
  assert.ok(new Set(colourNs).size === explore.selection.max, `colours not distinct: ${colourNs.join(',')}`);
  assert.deepEqual(markers, seriesPalette.markers.slice(0, explore.selection.max), 'marker shapes');
});

test('T4 with nine series: the ninth wraps to the first colour and circle marker', () => {
  const svg = t4.render(syntheticData(WRAP_COUNT), { width: viewSettings.defaultWidth });
  const key = svgGroup(svg, WRAP_COUNT - 1, 'key');
  assert.ok(key !== null, 'no legend key for series 8');
  assert.ok(/class="sf-1"/.test(key) || /class="s-1"/.test(key), `series 8 key is ${key}`);
  assert.ok(/data-marker="circle"/.test(key), `series 8 marker is ${key}`);
});

// Browser only: the computed custom properties of tokens.css and the computed paint of the rendered SVG.
if (typeof document === 'undefined') {
  skip('computed --series-N values and T4 legend paint match the palette: browser only', 'browser only');
} else {
  const THEME_CASES = [
    { label: 'default', theme: 'dark', attr: null },
    { label: 'dark', theme: 'dark', attr: 'dark' },
    { label: 'light', theme: 'light', attr: 'light' },
  ];

  function withTheme(attr, fn) {
    const root = document.documentElement;
    const original = root.getAttribute('data-theme');
    try {
      if (attr === null) root.removeAttribute('data-theme');
      else root.setAttribute('data-theme', attr);
      return fn(root);
    } finally {
      if (original === null) root.removeAttribute('data-theme');
      else root.setAttribute('data-theme', original);
    }
  }

  test('computed --series-N in tokens.css equals the palette in default, dark and light', () => {
    const failures = [];
    for (const c of THEME_CASES) {
      withTheme(c.attr, (root) => {
        const cs = getComputedStyle(root);
        for (let n = 1; n <= seriesPalette.count; n += 1) {
          const got = cs.getPropertyValue(`--series-${n}`).trim().toLowerCase();
          const want = seriesPalette[c.theme][n - 1];
          if (got !== want) failures.push(`${c.label} --series-${n}: computed ${got} is not ${want}`);
        }
      });
    }
    assert.deepEqual(failures, [], 'computed series colours');
  });

  test('T4 rendered in the browser: legend paint equals line paint and the palette, default, dark and light', () => {
    const failures = [];
    for (const c of THEME_CASES) {
      withTheme(c.attr, () => {
        const host = document.createElement('div');
        host.innerHTML = t4.render(syntheticData(explore.selection.max), { width: viewSettings.defaultWidth });
        document.body.appendChild(host);
        try {
          for (let k = 0; k < explore.selection.max; k += 1) {
            const keyEl = host.querySelector(`g[data-series="${k}"][data-role="key"]`).firstElementChild;
            const lineEl = host.querySelector(`g[data-series="${k}"][data-role="line"] polyline`);
            const keyPaint = keyEl.getAttribute('class').startsWith('sf-') ? getComputedStyle(keyEl).fill : getComputedStyle(keyEl).stroke;
            const linePaint = getComputedStyle(lineEl).stroke;
            const [r, g, b] = parseHex(seriesPalette[c.theme][k]);
            const want = `rgb(${r}, ${g}, ${b})`;
            const where = `${c.label} series ${k}: ${keyEl.tagName} class=${keyEl.getAttribute('class')} parent=${keyEl.parentNode.getAttribute('data-role')}`;
            if (keyPaint !== want) failures.push(`${where} legend paint ${keyPaint} is not ${want}`);
            if (linePaint !== want) failures.push(`${where} line paint ${linePaint} is not ${want}`);
          }
        } finally {
          host.remove();
        }
      });
    }
    assert.deepEqual(failures, [], 'T4 paint');
  });
}
