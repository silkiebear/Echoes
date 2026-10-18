// Self-tests for the settings model: defaults, validation rules, storage round-trip, and no-value leaks.
import { test, assert } from '../core/harness.js';
import {
  defaultSettings,
  validateSettings,
  loadCached,
  saveCached,
  exportSettingsText,
} from '../core/settings.js';

// 1. Defaults validate cleanly and match a fresh defaultSettings() call.
test('defaults are valid', () => {
  const result = validateSettings(defaultSettings());
  assert.deepEqual(result.errors, [], 'no errors on defaults');
  assert.deepEqual(result.settings, defaultSettings(), 'settings equal fresh defaults');
});

// 2. The 11 default categories keep their canonical code order.
test('defaults carry the 11 category codes in order', () => {
  const codes = defaultSettings().categories.map((c) => c.code);
  assert.deepEqual(codes, ['S', 'F', 'B', 'H', 'A', 'W', 'P', 'E', 'T', 'D', 'M'], 'category codes');
});

// 3. Unknown top-level keys survive validation unchanged.
test('unknown top-level keys are kept', () => {
  const result = validateSettings({ version: 1, extra: { a: 1 } });
  assert.deepEqual(result.settings.extra, { a: 1 }, 'extra key preserved');
});

// 4. A newer version is rejected with a single error and no settings.
test('newer version is rejected', () => {
  const result = validateSettings({ version: 2 });
  assert.equal(result.settings, null, 'no settings for newer version');
  assert.equal(result.errors.length, 1, 'one error for newer version');
});

// 5. A bad mood element drops all its fields and never leaks the offending value.
test('invalid mood fields are reported without leaking values', () => {
  const result = validateSettings({
    version: 1,
    moods: [{ name: '', order: 0, color: 'SECRET-VALUE' }],
  });
  assert.deepEqual(result.errors, [
    'moods[0].name: missing or invalid',
    'moods[0].order: missing or invalid',
    'moods[0].color: missing or invalid',
  ], 'three field errors in order');
  assert.deepEqual(result.settings.moods, defaultSettings().moods, 'no valid mood keeps the presets');
  assert.ok(
    result.errors.every((line) => line.indexOf('SECRET-VALUE') === -1),
    'no error string contains the bad value',
  );
});

// 6. Exporting a validated object and re-validating yields the same object.
test('export then validate round-trips', () => {
  const s = validateSettings({
    version: 1,
    moods: [{ name: 'good', order: 1, color: '#3f9e6b' }],
    ui: { theme: 'light', weekStart: 0 },
  }).settings;
  const t = validateSettings(JSON.parse(exportSettingsText(s))).settings;
  assert.deepEqual(t, s, 're-validated export equals original');
});

// 7. A category with a lowercase code is dropped with a path error.
test('invalid category is dropped with a path error', () => {
  const result = validateSettings({
    version: 1,
    categories: [{ code: 's', name: 'x', color: '#000000' }],
  });
  assert.deepEqual(result.settings.categories, [], 'invalid category dropped');
  assert.deepEqual(result.errors, ['categories[0].code: missing or invalid'], 'code error reported');
});

// 8. A weekStart outside 0-6 falls back to the view default and is flagged.
test('weekStart out of range falls back to default', () => {
  const result = validateSettings({ version: 1, ui: { theme: 'dark', weekStart: 9 } });
  assert.equal(
    result.settings.ui.weekStart,
    defaultSettings().ui.weekStart,
    'weekStart falls back to default',
  );
  assert.deepEqual(result.errors, ['ui.weekStart: missing or invalid'], 'weekStart flagged');
});

// 9. A non-object input is rejected wholesale.
test('non-object input is rejected', () => {
  const result = validateSettings(null);
  assert.equal(result.settings, null, 'no settings for non-object');
  assert.deepEqual(result.errors, ['settings: not a JSON object'], 'single rejection error');
});

// 9b. The five presets are the default moods, in order, with the configured colours.
test('defaults carry the five mood presets in order', () => {
  const names = defaultSettings().moods.map((m) => `${m.order}:${m.name}`);
  assert.deepEqual(names, ['1:yay!', '2:good', '3:meh', '4:bad', '5:awful'], 'preset names and orders');
});

// 9c. A saved mood list that has valid entries wins over the presets, even when it has fewer than five.
test('cached three-mood settings win over the presets', () => {
  const moods = [
    { name: 'good', order: 1, color: '#3f9e6b' },
    { name: 'ok', order: 2, color: '#7cbf5a' },
    { name: 'bad', order: 3, color: '#c4553f' },
  ];
  const result = validateSettings({ version: 1, moods });
  assert.deepEqual(result.settings.moods, moods, 'saved moods kept');
  assert.deepEqual(result.errors, [], 'no errors');
});

// 9d. An empty mood list (the old default, possibly still cached) falls back to the presets.
test('an empty saved mood list falls back to the presets', () => {
  assert.deepEqual(validateSettings({ version: 1, moods: [] }).settings.moods, defaultSettings().moods, 'presets used');
});

// 10. Without storage, load returns null and save returns false; with storage, load must not throw.
test('loadCached and saveCached without storage', () => {
  if (typeof globalThis.localStorage === 'undefined') {
    assert.equal(loadCached(), null, 'loadCached returns null without storage');
    assert.equal(saveCached(defaultSettings()), false, 'saveCached returns false without storage');
  } else {
    loadCached();
    assert.ok(true, 'loadCached does not throw when storage present');
  }
});
