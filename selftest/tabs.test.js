// Tab map, placement, keyboard movement, initial tab and withPanelVisible. Pure, so it runs in Node and in the browser.
// The real config is checked against the module ids that manifest.js actually loads.
import { test, assert } from '../core/harness.js';
import { tabs, tabSettings } from '../config/tabs.js';
import { checkTabs, placeModules, nextTab, initialTab, withPanelVisible } from '../core/tabs.js';
import { modules as manifest } from '../modules/manifest.js';

const TAB_IDS = tabs.map((tab) => tab.id);
const { defaultTab, unlistedTab } = tabSettings;

async function realModuleIds() {
  const base = new URL('../modules/', import.meta.url);
  const ids = [];
  for (const path of manifest) {
    const ns = await import(new URL(path, base).href);
    ids.push(ns.default.id);
  }
  return ids;
}

test('real tab map: every manifest module is listed in exactly one tab, no errors, nothing unlisted', async () => {
  const r = checkTabs(tabs, await realModuleIds(), tabSettings);
  assert.deepEqual(r.errors, [], 'tab map errors');
  assert.deepEqual(r.unlisted, [], 'unlisted modules');
});

test('real tab map: default and unlisted tabs exist', () => {
  assert.ok(TAB_IDS.includes(defaultTab), 'defaultTab is not a tab id');
  assert.ok(TAB_IDS.includes(unlistedTab), 'unlistedTab is not a tab id');
});

test('checkTabs reports planted errors: unknown module, module in two tabs, duplicate tab id, missing defaultTab and unlistedTab', () => {
  const planted = [
    { id: 't1', title: 'One', modules: ['a', 'nope'] },
    { id: 't2', title: 'Two', modules: ['a'] },
    { id: 't1', title: 'Again', modules: ['b'] },
  ];
  const r = checkTabs(planted, ['a', 'b'], { defaultTab: 'missing', unlistedTab: 'gone' });
  const text = r.errors.join('\n');
  assert.ok(text.includes('unknown module id in tab t1: nope'), `unknown id not reported: ${text}`);
  assert.ok(text.includes('module a is in two tabs: t1 and t2'), `duplicate module not reported: ${text}`);
  assert.ok(text.includes('duplicate tab id: t1'), `duplicate tab id not reported: ${text}`);
  assert.ok(text.includes('defaultTab missing is not a tab id'), `missing defaultTab not reported: ${text}`);
  assert.ok(text.includes('unlistedTab gone is not a tab id'), `missing unlistedTab not reported: ${text}`);
  assert.equal(r.errors.length, 5, `error count: ${text}`);
  assert.deepEqual(r.unlisted, [], 'both ids are listed somewhere');
});

test('checkTabs lists a module that no tab names as unlisted', () => {
  const r = checkTabs([{ id: 't1', title: 'One', modules: ['a'] }], ['a', 'extra'], { defaultTab: 't1', unlistedTab: 't1' });
  assert.deepEqual(r.errors, [], 'no errors expected');
  assert.deepEqual(r.unlisted, ['extra'], 'unlisted modules');
});

test('placeModules sends an unlisted module to unlistedTab, or to the first tab when that id is missing', () => {
  const sample = [{ id: 'x', title: 'X', modules: ['a'] }, { id: 'y', title: 'Y', modules: [] }];
  const placed = placeModules(sample, ['a', 'b'], 'y');
  assert.equal(placed.get('a'), 'x', 'listed module moved');
  assert.equal(placed.get('b'), 'y', 'unlisted module not sent to unlistedTab');
  const fallback = placeModules(sample, ['b'], 'zzz');
  assert.equal(fallback.get('b'), 'x', 'unlisted module not sent to the first tab');
});

test('nextTab: arrows wrap, Home and End jump to the ends, other keys keep the tab', () => {
  const ids = ['a', 'b', 'c'];
  assert.equal(nextTab(ids, 'a', 'ArrowRight'), 'b', 'right');
  assert.equal(nextTab(ids, 'c', 'ArrowRight'), 'a', 'right wraps to the first tab');
  assert.equal(nextTab(ids, 'b', 'ArrowLeft'), 'a', 'left');
  assert.equal(nextTab(ids, 'a', 'ArrowLeft'), 'c', 'left wraps to the last tab');
  assert.equal(nextTab(ids, 'c', 'Home'), 'a', 'Home');
  assert.equal(nextTab(ids, 'a', 'End'), 'c', 'End');
  assert.equal(nextTab(ids, 'b', 'Enter'), 'b', 'other key');
  assert.equal(nextTab([], 'x', 'ArrowRight'), 'x', 'no tabs');
});

test('initialTab: a stored id that exists is used; a missing, unknown or null id falls back to the default', () => {
  assert.equal(initialTab(TAB_IDS, 'scan', defaultTab), 'scan', 'stored id ignored');
  assert.equal(initialTab(TAB_IDS, 'removed', defaultTab), defaultTab, 'unknown id not replaced');
  assert.equal(initialTab(TAB_IDS, null, defaultTab), defaultTab, 'null not replaced');
  assert.equal(initialTab(['a', 'b'], 'zzz', 'nope'), 'a', 'no valid fallback should give the first tab');
});

test('withPanelVisible shows the panel during fn and restores hidden, also when fn throws', async () => {
  const panel = { hidden: true };
  let seen = null;
  const result = await withPanelVisible(panel, () => {
    seen = panel.hidden;
    return 42;
  });
  assert.equal(seen, false, 'panel not visible during fn');
  assert.equal(result, 42, 'result not returned');
  assert.equal(panel.hidden, true, 'hidden not restored');

  const shown = { hidden: false };
  await withPanelVisible(shown, async () => {
    assert.equal(shown.hidden, false, 'async fn: panel hidden');
  });
  assert.equal(shown.hidden, false, 'already visible panel was hidden afterwards');

  const thrown = { hidden: true };
  let caught = null;
  try {
    await withPanelVisible(thrown, async () => {
      throw new Error('planted');
    });
  } catch (err) {
    caught = err;
  }
  assert.ok(caught && caught.message === 'planted', 'error not propagated');
  assert.equal(thrown.hidden, true, 'hidden not restored after a throw');
});
