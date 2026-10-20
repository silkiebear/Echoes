// Text-group palette (phase 4e, 4e.2.2; Node and browser). The rules are the phase's: the hue of every chromatic accent is at
// least 35 degrees from each mood preset and each diverging endpoint; violet (what) and plum (how) are at least 35 degrees
// apart; the text and the caption (accent) reach 4.5:1 on every tint; the accent border reaches 3:1 on the card surface; the
// tint differs from the card surface by at least 1.05:1 (WCAG relative luminance); in dark only, the accent saturation is
// at most 40 percent and the tint saturation at most 22 percent (phase 4f.0.2); in dark, each tint is the formula
// mixHex(surface, accent, palette.darkTintMix), 1.10 to 1.25 on the surface, channel spread at most 14 (phase 4g.2).
// Node checks the rules on fixed values,
// including planted bad ones. The browser reads the computed custom properties of tokens.css in both themes: Node has no
// stylesheet reader here, and app code does not read files.
import { test, skip, assert } from '../core/harness.js';
import { settingsConfig } from '../config/settings.js';
import { palette } from '../config/palette.js';
import { mixHex, channelSpread } from '../core/color.js';

// The phase's limits. They are this test's rules, not product tunables.
const HUE_MIN_DEG = 35;
const TEXT_MIN = 4.5;
const BORDER_MIN = 3;
const TINT_MIN = 1.05;
// HSL saturation below this is achromatic: a hue is not defined, so the hue rule does not apply (care).
const CHROMA_MIN = 0.05;
// Dark only (phase 4f.0.2): HSL saturation caps so the dark groups stay soft next to the text.
const DARK_ACCENT_SAT_MAX = 0.4;
const DARK_TINT_SAT_MAX = 0.22;
const GROUPS = ['what', 'how', 'check', 'numbers', 'care'];

// Diverging endpoints as they are in views.css (--div-1, --div-7) and tokens.css (--diverge-neg, --diverge-pos).
const DIVERGE = {
  dark: ['#2c6fb8', '#b65f1c', '#3a7bd5', '#e8862e'],
  light: ['#1f5fa0', '#a9520f', '#2b6cb0', '#d9731f'],
};
const MOOD_HEXES = settingsConfig.moodPresets.map((m) => m.color);

// The candidate values of tokens.css (copied there in 4e.2; the browser test reads the stylesheet itself).
const FIXED = {
  dark: {
    text: '#e7e9ee', surface: '#1e2129',
    groups: {
      what: { accent: '#bba9da', tint: '#2e2f3b' },
      how: { accent: '#daa9ca', tint: '#312f39' },
      check: { accent: '#cb86b6', tint: '#2f2b37' },
      numbers: { accent: '#b6c3bf', tint: '#2d3138' },
      care: { accent: '#b8b8b8', tint: '#2d3037' },
    },
  },
  light: {
    text: '#1c1f26', surface: '#ffffff',
    groups: {
      what: { accent: '#5d36a1', tint: '#f3effb' },
      how: { accent: '#993377', tint: '#faf0f7' },
      check: { accent: '#8e2970', tint: '#f5e5f0' },
      numbers: { accent: '#53655f', tint: '#ebefee' },
      care: { accent: '#616161', tint: '#ebebeb' },
    },
  },
};

function rgbOf(hex) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
}

// Hue (degrees) and HSL saturation of a #rrggbb colour.
function hueSat(hex) {
  const [r, g, b] = rgbOf(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: h * 60, s };
}

function hueDistance(a, b) {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
}

function luminance(hex) {
  const [r, g, b] = rgbOf(hex).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

// theme: { name, text, surface, groups: { kind: { accent, tint } }, refs: [hex] }. Returns { rows, failures }.
function evaluate(theme) {
  const rows = [];
  const failures = [];
  const hues = {};
  for (const kind of GROUPS) {
    const { accent, tint } = theme.groups[kind];
    const { h, s } = hueSat(accent);
    const row = {
      kind,
      accent,
      tint,
      hue: s < CHROMA_MIN ? null : Math.round(h),
      nearestRef: null,
      textOnTint: contrast(theme.text, tint),
      captionOnTint: contrast(accent, tint),
      accentOnSurface: contrast(accent, theme.surface),
      tintOnSurface: contrast(tint, theme.surface),
    };
    if (theme.name === 'dark') {
      if (s > DARK_ACCENT_SAT_MAX) failures.push(`dark ${kind}: accent saturation ${Math.round(s * 100)} percent is above ${DARK_ACCENT_SAT_MAX * 100}`);
      const tintSat = hueSat(tint).s;
      if (tintSat > DARK_TINT_SAT_MAX) failures.push(`dark ${kind}: tint saturation ${Math.round(tintSat * 100)} percent is above ${DARK_TINT_SAT_MAX * 100}`);
      const formula = mixHex(theme.surface, accent, palette.darkTintMix);
      if (tint !== formula) failures.push(`dark ${kind}: tint ${tint} is not mixHex(surface, accent, ${palette.darkTintMix}) = ${formula}`);
      if (row.tintOnSurface < palette.tintOnSurface.min || row.tintOnSurface > palette.tintOnSurface.max) {
        failures.push(`dark ${kind}: tint on surface ${row.tintOnSurface.toFixed(3)} is outside ${palette.tintOnSurface.min} to ${palette.tintOnSurface.max}`);
      }
      const spread = channelSpread(tint);
      if (spread > palette.tintSpreadMax) failures.push(`dark ${kind}: tint channel spread ${spread} is above ${palette.tintSpreadMax}`);
    }
    if (s >= CHROMA_MIN) {
      hues[kind] = h;
      const nearest = Math.min(...theme.refs.map((ref) => hueDistance(h, hueSat(ref).h)));
      row.nearestRef = Math.round(nearest * 10) / 10;
      if (nearest < HUE_MIN_DEG) failures.push(`${theme.name} ${kind}: hue ${Math.round(h)} is ${row.nearestRef} degrees from a mood or diverging colour`);
    }
    if (row.textOnTint < TEXT_MIN) failures.push(`${theme.name} ${kind}: text on tint ${row.textOnTint.toFixed(2)}`);
    if (row.captionOnTint < TEXT_MIN) failures.push(`${theme.name} ${kind}: caption on tint ${row.captionOnTint.toFixed(2)}`);
    if (row.accentOnSurface < BORDER_MIN) failures.push(`${theme.name} ${kind}: border on surface ${row.accentOnSurface.toFixed(2)}`);
    if (row.tintOnSurface < TINT_MIN) failures.push(`${theme.name} ${kind}: tint on surface ${row.tintOnSurface.toFixed(3)}`);
    rows.push(row);
  }
  if (hues.what !== undefined && hues.how !== undefined && hueDistance(hues.what, hues.how) < HUE_MIN_DEG) {
    failures.push(`${theme.name}: violet and plum are ${Math.round(hueDistance(hues.what, hues.how))} degrees apart`);
  }
  return { rows, failures };
}

function fixedTheme(name, override = {}) {
  const base = FIXED[name];
  return {
    name,
    text: base.text,
    surface: base.surface,
    groups: { ...base.groups, ...override },
    refs: [...MOOD_HEXES, ...DIVERGE[name]],
  };
}

test('palette rules: a planted mood-like green accent fails the hue rule', () => {
  const planted = fixedTheme('dark', { what: { accent: '#2e7d32', tint: FIXED.dark.groups.what.tint } });
  const { failures } = evaluate(planted);
  assert.ok(failures.some((f) => /what: hue/.test(f)), `expected a hue failure, got ${failures.join('; ')}`);
});

test('palette rules: a planted dark accent at 70 percent saturation fails the saturation rule', () => {
  const planted = fixedTheme('dark', { what: { accent: '#b697ed', tint: FIXED.dark.groups.what.tint } });
  const { failures } = evaluate(planted);
  assert.ok(failures.some((f) => /dark what: accent saturation 70/.test(f)), `expected a saturation failure, got ${failures.join('; ')}`);
});

test('palette rules: a planted tint that is too close to the text fails the text rule', () => {
  const planted = fixedTheme('light', { how: { accent: FIXED.light.groups.how.accent, tint: '#777777' } });
  const { failures } = evaluate(planted);
  assert.ok(failures.some((f) => /how: text on tint/.test(f)), `expected a text failure, got ${failures.join('; ')}`);
});

test('palette rules: the old dark tints #442c3d and #35413d are rejected', () => {
  const planted = fixedTheme('dark', {
    how: { accent: FIXED.dark.groups.how.accent, tint: '#442c3d' },
    numbers: { accent: FIXED.dark.groups.numbers.accent, tint: '#35413d' },
  });
  const { failures } = evaluate(planted);
  assert.ok(failures.some((f) => /dark how: tint #442c3d/.test(f)), `expected the how tint to fail, got ${failures.join('; ')}`);
  assert.ok(failures.some((f) => /dark numbers: tint #35413d/.test(f)), `expected the numbers tint to fail, got ${failures.join('; ')}`);
});

test('palette rules: an off-formula dark tint is rejected by the formula rule', () => {
  const planted = fixedTheme('dark', { what: { accent: FIXED.dark.groups.what.accent, tint: '#2e2f3c' } });
  const { failures } = evaluate(planted);
  assert.ok(failures.some((f) => /dark what: tint #2e2f3c is not mixHex/.test(f)), `expected a formula failure, got ${failures.join('; ')}`);
});

test('palette rules: the candidate values pass every rule in both themes', () => {
  for (const name of ['dark', 'light']) {
    const { failures } = evaluate(fixedTheme(name));
    assert.deepEqual(failures, [], `${name}`);
  }
});

// Browser only: the same rules on the computed custom properties of tokens.css, in both themes.
if (typeof document === 'undefined') {
  skip('computed group palette of tokens.css: every rule passes in dark and light', 'browser only');
} else {
  test('computed group palette of tokens.css: every rule passes in default, dark and light, and matches FIXED', () => {
    const root = document.documentElement;
    const original = root.getAttribute('data-theme');
    const failures = [];
    // No attribute is the default; tokens.css gives it the dark values on :root.
    const cases = [
      { label: 'default', name: 'dark', attr: null },
      { label: 'dark', name: 'dark', attr: 'dark' },
      { label: 'light', name: 'light', attr: 'light' },
    ];
    try {
      for (const c of cases) {
        if (c.attr === null) root.removeAttribute('data-theme');
        else root.setAttribute('data-theme', c.attr);
        const cs = getComputedStyle(root);
        const read = (prop) => cs.getPropertyValue(prop).trim();
        const groups = Object.fromEntries(GROUPS.map((kind) => [kind, { accent: read(`--grp-${kind}-accent`), tint: read(`--grp-${kind}-tint`) }]));
        const refs = [...MOOD_HEXES, read('--div-1'), read('--div-7'), read('--diverge-neg'), read('--diverge-pos')];
        const theme = { name: c.name, text: read('--text'), surface: read('--surface'), groups, refs };
        failures.push(...evaluate(theme).failures.map((f) => `${c.label}: ${f}`));
        for (const kind of GROUPS) {
          const want = FIXED[c.name].groups[kind];
          if (groups[kind].tint !== want.tint) failures.push(`${c.label} ${kind}: computed tint ${groups[kind].tint} is not ${want.tint}`);
          if (groups[kind].accent !== want.accent) failures.push(`${c.label} ${kind}: computed accent ${groups[kind].accent} is not ${want.accent}`);
        }
      }
    } finally {
      if (original === null) root.removeAttribute('data-theme');
      else root.setAttribute('data-theme', original);
    }
    assert.deepEqual(failures, [], 'computed palette');
  });
}
