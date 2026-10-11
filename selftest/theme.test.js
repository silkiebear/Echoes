import { test, skip, assert } from '../core/harness.js';

const THEME_KEY = 'echoes.theme';

if (typeof document === 'undefined') {
  skip('no light theme is applied without a saved choice', 'browser only');
} else {
  test('no light theme is applied without a saved choice', () => {
    let saved = null;
    try {
      saved = window.localStorage.getItem(THEME_KEY);
    } catch {
      saved = null;
    }
    const applied = document.documentElement.dataset.theme;
    if (saved === 'light' || saved === 'dark') {
      assert.equal(applied, saved, 'saved choice should be applied');
      return;
    }
    assert.ok(applied !== 'light', 'light theme applied by default');
  });
}
