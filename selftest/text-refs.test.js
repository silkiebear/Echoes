// User-visible text (phase 4f.4.2; Node and browser). Every exported value of every config file is walked, and each string
// is checked for: SPEC, the word phase (any case), a project file name (.md or .js), a backslash, the tracker's brand name
// (built from parts, so that this file does not contain it; lint L3), and "section " followed by a digit. Config keys are not
// checked. Two groups of strings are never shown to the user and are skipped with their reason: the test-file paths of the
// self-test groups and the worker file name of the statistics engine. The check itself is tested on planted strings.
import { test, assert } from '../core/harness.js';
import * as app from '../config/app.js';
import * as assets from '../config/assets.js';
import * as explore from '../config/explore.js';
import * as exploreEcho from '../config/explore-echo.js';
import * as exploreHelp from '../config/explore-help.js';
import * as flags from '../config/flags.js';
import * as labelGuide from '../config/label-guide.js';
import * as notes from '../config/notes.js';
import * as parser from '../config/parser.js';
import * as selftestGroups from '../config/selftest-groups.js';
import * as settings from '../config/settings.js';
import * as stats from '../config/stats.js';
import * as statsDrift from '../config/stats-drift.js';
import * as statsPower from '../config/stats-power.js';
import * as statsShared from '../config/stats-shared.js';
import * as statsSynth from '../config/stats-synth.js';
import * as synth from '../config/synth.js';
import * as tabs from '../config/tabs.js';
import * as version from '../config/version.js';
import * as views from '../config/views.js';
import * as windows from '../config/windows.js';

const CONFIGS = {
  app, assets, explore, 'explore-echo': exploreEcho, 'explore-help': exploreHelp, flags, 'label-guide': labelGuide,
  notes, parser, 'selftest-groups': selftestGroups, settings, stats, 'stats-drift': statsDrift, 'stats-power': statsPower,
  'stats-shared': statsShared, 'stats-synth': statsSynth, synth, tabs, version, views, windows,
};

// Never shown: the test-file paths of the self-test groups (the panel shows group titles) and the worker file name.
const NOT_SHOWN = [
  ['selftest-groups', /(^|\.)files(\[\d+\])?$/, 'self-test file paths'],
  ['stats', /(^|\.)worker\.path$/, 'statistics worker file name'],
];

const BRAND = new RegExp(['day', 'lio'].join(''), 'i');
const RULES = [
  ['SPEC', /\bSPEC\b/],
  ['phase', /\bphase\b/i],
  ['project file name', /\.(md|js)\b/],
  ['backslash', /\\/],
  ['brand', BRAND],
  ['section number', /\bsection \d/],
];

function walk(value, path, out) {
  if (typeof value === 'string') out.push({ path, text: value });
  else if (Array.isArray(value)) value.forEach((v, i) => walk(v, `${path}[${i}]`, out));
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) walk(v, path ? `${path}.${k}` : k, out);
  }
  return out;
}

function violations(entries) {
  const found = [];
  for (const { path, text } of entries) {
    for (const [name, re] of RULES) if (re.test(text)) found.push(`${path} [${name}]`);
  }
  return found;
}

function shownStrings() {
  const shown = [];
  for (const [name, mod] of Object.entries(CONFIGS)) {
    for (const [key, value] of Object.entries(mod)) {
      for (const entry of walk(value, key, [])) {
        const hidden = NOT_SHOWN.some(([file, re]) => file === name && re.test(entry.path));
        if (!hidden) shown.push({ path: `${name}.${entry.path}`, text: entry.text });
      }
    }
  }
  return shown;
}

test('user-visible config text: no SPEC, phase, project file name, backslash, brand name or section number', () => {
  const found = violations(shownStrings());
  assert.deepEqual(found, [], 'violations');
});

test('the check finds planted strings (SPEC, phase, a file name, a backslash, the brand, a section number)', () => {
  const planted = [
    'See SPEC 11.', 'This is phase 4f.', 'Read notes.md now.', 'Open app\\config.', `A ${BRAND.source} example.`, 'See section 3.',
  ].map((text, i) => ({ path: `planted[${i}]`, text }));
  const found = violations(planted);
  assert.equal(found.length, 6, `expected six hits, got ${found.join('; ')}`);
});

test('the check passes ordinary words that contain a banned fragment (phases, sections, specific)', () => {
  const ok = ['specific values', 'the sections below', 'a phasing plan'].map((text, i) => ({ path: `ok[${i}]`, text }));
  assert.deepEqual(violations(ok), [], 'no hits');
});
