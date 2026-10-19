// Text-group palette (phase 4e, 4e.2.2; Node and browser). The rules are the phase's: the hue of every chromatic accent is at
// least 35 degrees from each mood preset and each diverging endpoint; violet (what) and plum (how) are at least 35 degrees
// apart; the text and the caption (accent) reach 4.5:1 on every tint; the accent border reaches 3:1 on the card surface; the
// tint differs from the card surface by at least 1.05:1 (WCAG relative luminance). Node checks the rules on fixed values,
// including planted bad ones. The browser reads the computed custom properties of tokens.css in both themes: Node has no
// stylesheet reader here, and app code does not read files.
import { test, skip, assert } from '../core/harness.js';
import { settingsConfig } from '../config/settings.js';

// The phase's limits. They are this test's rules, not product tunables.
const HUE_MIN_DEG = 35;
const TEXT_MIN = 4.5;
const BORDER_MIN = 3;
const TINT_MIN = 1.05;
// HSL saturation below this is achromatic: a hue is not defined, so the hue rule does not apply (care).
const CHROMA_MIN = 0.05;
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
      what: { accent: '#b89de7', tint: '#342749' },
      how: { accent: '#e0a3cc', tint: '#462a3d' },
      check: { accent: '#d879bb', tint: '#381e31' },
      numbers: { accent: '#b6c3bf', tint: '#35413d' },
      care: { accent: '#b8b8b8', tint: '#404040' },
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

test('palette rules: a planted tint that is too close to the text fails the text rule', () => {
  const planted = fixedTheme('light', { how: { accent: FIXED.light.groups.how.accent, tint: '#777777' } });
  const { failures } = evaluate(planted);
  assert.ok(failures.some((f) => /how: text on tint/.test(f)), `expected a text failure, got ${failures.join('; ')}`);
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
  test('computed group palette of tokens.css: every rule passes in dark and light', () => {
    const root = document.documentElement;
    const original = root.getAttribute('data-theme');
    const failures = [];
    try {
      for (const name of ['dark', 'light']) {
        if (name === 'dark') root.setAttribute('data-theme', 'dark');
        else root.setAttribute('data-theme', 'light');
        const cs = getComputedStyle(root);
        const read = (prop) => cs.getPropertyValue(prop).trim();
        const groups = Object.fromEntries(GROUPS.map((kind) => [kind, { accent: read(`--grp-${kind}-accent`), tint: read(`--grp-${kind}-tint`) }]));
        const refs = [...MOOD_HEXES, read('--div-1'), read('--div-7'), read('--diverge-neg'), read('--diverge-pos')];
        const theme = { name, text: read('--text'), surface: read('--surface'), groups, refs };
        failures.push(...evaluate(theme).failures);
      }
    } finally {
      if (original === null) root.removeAttribute('data-theme');
      else root.setAttribute('data-theme', original);
    }
    assert.deepEqual(failures, [], 'computed palette');
  });
}
