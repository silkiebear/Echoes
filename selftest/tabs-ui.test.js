// Tab bar at 320 px and the Gallery charts (browser only). The bar under test is built in a 320 px host with scroll
// restore and storage writes off, so the page does not jump and the stored tab is not changed. The Gallery check
// uses the live panel and makes it visible only while it measures.
import { test, skip, assert } from '../core/harness.js';
import { buildTabs, withPanelVisible } from '../core/tabs.js';
import { tabs, tabSettings } from '../config/tabs.js';

const WIDTH = 320;
const MIN_TARGET = 44;
const ACTIVE_BORDER = 3;
const POLL_MS = 50;
const WAIT_LIMIT_MS = 10000;

function waitUntil(check) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      if (check()) resolve(true);
      else if (Date.now() - started > WAIT_LIMIT_MS) reject(new Error('charts did not get a width in time'));
      else setTimeout(tick, POLL_MS);
    };
    tick();
  });
}

if (typeof document === 'undefined') {
  skip('tab bar at 320 px: targets, one visible panel, active border; Gallery charts after the tab is shown', 'browser only');
} else {
  test('tab bar at 320 px: targets, one visible panel, active tab 3 px border in dark and light', () => {
    const host = document.createElement('div');
    host.style.width = `${WIDTH}px`;
    document.body.append(host);
    const original = document.documentElement.getAttribute('data-theme');
    const failures = [];
    try {
      const nav = buildTabs(host, tabs, { active: tabs[0].id, storageKey: null }, {
        label: tabSettings.ui.label,
        restoreScroll: false,
      });
      nav.show(tabs[0].id);
      const bar = host.querySelector('[role="tablist"]');
      const buttons = [...bar.querySelectorAll('[role="tab"]')];
      for (const theme of ['dark', 'light']) {
        if (theme === 'dark') document.documentElement.removeAttribute('data-theme');
        else document.documentElement.setAttribute('data-theme', 'light');
        const barHeight = bar.getBoundingClientRect().height;
        if (!(barHeight >= MIN_TARGET)) failures.push(`${theme}: tab bar is ${barHeight} px tall`);
        for (const btn of buttons) {
          const height = btn.getBoundingClientRect().height;
          if (!(height >= MIN_TARGET)) failures.push(`${theme}: tab "${btn.textContent}" is ${height} px tall`);
        }
        const visible = [...host.querySelectorAll('[role="tabpanel"]')].filter((p) => getComputedStyle(p).display !== 'none');
        if (visible.length !== 1) failures.push(`${theme}: ${visible.length} panels visible`);
        const active = buttons.find((b) => b.getAttribute('aria-selected') === 'true');
        const inactive = buttons.find((b) => b !== active);
        const style = getComputedStyle(active);
        if (parseFloat(style.borderBottomWidth) !== ACTIVE_BORDER) {
          failures.push(`${theme}: active tab border is ${style.borderBottomWidth}`);
        }
        if (inactive && getComputedStyle(inactive).fontWeight === style.fontWeight) {
          failures.push(`${theme}: active and inactive tabs have the same font weight`);
        }
      }
    } finally {
      host.remove();
      if (original === null) document.documentElement.removeAttribute('data-theme');
      else document.documentElement.setAttribute('data-theme', original);
    }
    assert.equal(failures.length, 0, failures.join('; '));
  });

  test('Gallery charts have a real width after the Gallery tab is shown', async () => {
    const panel = document.getElementById('panel-gallery');
    assert.ok(panel, 'Gallery panel is missing');
    const charts = [...panel.querySelectorAll('.chart-scroll')];
    assert.ok(charts.length > 0, 'no charts in the Gallery panel');
    const widths = await withPanelVisible(panel, async () => {
      window.dispatchEvent(new Event('resize'));
      await waitUntil(() => charts.every((c) => {
        const svg = c.querySelector('svg');
        return c.clientWidth > 0 && svg !== null && svg.getBoundingClientRect().width > 0;
      }));
      return charts.map((c) => c.clientWidth);
    });
    assert.ok(widths.every((w) => w > 0), `chart widths after the tab is shown: ${widths.join(', ')}`);
  });
}
