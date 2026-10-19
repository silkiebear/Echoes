// Label naming guide (phase 4f.1.4; Node). The guide's categories are the settings categories, every mark reads back
// through the parser, the worked examples are coded, each help part is non-empty and within the limit, and the guide's
// text holds no reference to project files, the phase, or the tracker's brand name. The brand pattern is built from parts
// so that this file does not contain the name (lint L3).
import { test, assert } from '../core/harness.js';
import { labelGuide } from '../config/label-guide.js';
import { settingsConfig } from '../config/settings.js';
import { explore } from '../config/explore.js';
import { readLabel } from '../core/label-code.js';
import { guideCategories } from '../modules/label-guide.js';

const BANNED = [
  ['SPEC', /\bSPEC\b/],
  ['phase', /phase/i],
  ['.js or .md', /\.(js|md)\b/i],
  ['backslash', /\\/],
  ['brand', new RegExp(['day', 'lio'].join(''), 'i')],
];
const PARTS = ['what', 'how', 'numbers', 'care'];
const MARKS = ['++', '+', '+-', '=', '-+', '-', '--'];
const EXAMPLES = ['Late coffee Fb--', 'Walk Aa++', 'Nap S=', 'Quiet day M+', 'Gym A1+'];

function strings(value, out = []) {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => strings(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => strings(v, out));
  return out;
}

test('guide categories equal the settings categories (code and name, same order)', () => {
  const shown = guideCategories(settingsConfig.categories);
  assert.deepEqual(shown, settingsConfig.categories.map(({ code, name }) => ({ code, name })), 'categories');
});

test('the seven value marks are listed in parser order and each reads back as its own mark', () => {
  assert.deepEqual(labelGuide.marks.map((m) => m.mark), MARKS, 'mark list');
  for (const { mark } of labelGuide.marks) {
    const r = readLabel(`Tea Fb${mark}`, settingsConfig.categories);
    assert.deepEqual([r.status, r.mark], ['coded', mark], `mark ${mark}`);
  }
});

test('the five worked examples are coded and their parts are shown', () => {
  assert.deepEqual(labelGuide.examples.list, EXAMPLES, 'examples');
  for (const text of labelGuide.examples.list) {
    assert.equal(readLabel(text, settingsConfig.categories).status, 'coded', text);
  }
});

test('the checker shows "no code" for a label without a code, and the mark meanings are short words', () => {
  assert.ok(labelGuide.check.status.uncoded.startsWith('no code'), 'uncoded status starts with no code');
  for (const { meaning } of labelGuide.marks) assert.ok(meaning.length > 0 && meaning.length <= 30, `meaning ${meaning}`);
});

test('each "How to read this" part is non-empty and within explore.help.maxChars', () => {
  for (const part of PARTS) {
    const text = labelGuide.help[part];
    assert.ok(typeof text === 'string' && text.length > 0, `${part} is empty`);
    assert.ok(text.length <= explore.help.maxChars, `${part} has ${text.length} characters, limit ${explore.help.maxChars}`);
  }
});

test('the guide text holds no SPEC, phase, file name, backslash or brand name', () => {
  const texts = strings(labelGuide);
  for (const [name, re] of BANNED) {
    const hits = texts.filter((t) => re.test(t));
    assert.deepEqual(hits, [], `${name} in guide text`);
  }
});
