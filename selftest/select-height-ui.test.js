// Explore selects: every select on the Explore tab (T1 to T4, E1, E2, E4) must be given an explicit height by some
// stylesheet rule that matches it (browser only; phase 4g.1). A min-height alone measured 29 px on a phone (cause
// UNVERIFIED), so the rule is checked in the stylesheet rather than by pixels. The store is restored afterwards.
import { test, skip, assert } from '../core/harness.js';
import * as store from '../core/store.js';
import { exportText } from '../core/synth-export.js';
import { parseExport } from '../core/export-parse.js';
import { defaultSettings } from '../core/settings.js';
import { runScan } from '../core/stats/run.js';
import { stats } from '../config/stats.js';
import { synth as synthConfig } from '../config/synth.js';
import { parser } from '../config/parser.js';
import exploreEchoModule from '../modules/explore-echo.js';
import exploreTimeModule from '../modules/explore-time.js';

const WIDTH = 320;
const EVENT_TEXT = 'Late coffee F-';
const OUTCOME_TEXT = 'Poor sleep S-';

if (typeof document === 'undefined') {
  skip('explore selects carry an explicit height rule at 320 px, dark and light; store restored', 'browser only');
} else {
  // Top-level style rules and rules inside grouping rules (for example @media); a sheet that cannot be read is skipped.
  function collectRules(state) {
    const rules = [];
    const walk = (list) => {
      for (const rule of list) {
        if (rule.selectorText) rules.push(rule);
        if (rule.cssRules) walk(rule.cssRules);
      }
    };
    for (const sheet of document.styleSheets) {
      try {
        walk(sheet.cssRules);
      } catch {
        state.skipped += 1;
      }
    }
    return rules;
  }

  function hasHeightRule(select, rules) {
    return rules.some((rule) => {
      if (!rule.style || rule.style.height === '') return false;
      try {
        return select.matches(rule.selectorText);
      } catch {
        return false;
      }
    });
  }

  test('explore selects carry an explicit height rule at 320 px, dark and light; store restored', async () => {
    const original = document.documentElement.getAttribute('data-theme');
    const saved = {
      data: store.get().data,
      parseStats: store.get().parseStats,
      selection: store.get().selection,
      pair: store.get().pair,
      scanResult: store.get().scanResult,
      settings: store.get().settings,
      exploreChoice: store.get().exploreChoice,
    };
    const host = document.createElement('section');
    host.style.width = `${WIDTH}px`;
    document.body.append(host);
    const failures = [];
    const state = { skipped: 0 };
    try {
      const parsed = parseExport(exportText(synthConfig, {}), parser).data;
      const settings = defaultSettings();
      const scan = await runScan({ data: parsed, settings }, { mode: 'fast', cfg: { ...stats, scanTest: 'stratified' } });
      const event = parsed.labels.find((l) => l.text === EVENT_TEXT).id;
      const outcome = parsed.labels.find((l) => l.text === OUTCOME_TEXT).id;
      const third = parsed.labels.find((l) => l.id !== event && l.id !== outcome).id;
      store.set({
        data: parsed,
        parseStats: null,
        selection: [event, outcome, third],
        pair: { window: '1d' },
        scanResult: { rows: scan.rows, meta: scan.meta, data: parsed, settings },
        settings,
        exploreChoice: undefined,
      });
      exploreTimeModule.mount(host, {});
      exploreEchoModule.mount(host, {});
      for (const theme of ['dark', 'light']) {
        if (theme === 'dark') document.documentElement.removeAttribute('data-theme');
        else document.documentElement.setAttribute('data-theme', 'light');
        const rules = collectRules(state);
        for (const select of host.querySelectorAll('select')) {
          if (!hasHeightRule(select, rules)) {
            const parent = select.parentElement;
            const card = select.closest('section.card');
            const name = card?.querySelector('h2')?.textContent.slice(0, 2) ?? 'no card';
            failures.push(`${theme}: ${name}: select class "${select.className}" in parent class "${parent ? parent.className : ''}": `
              + 'no matching stylesheet rule sets height');
          }
        }
      }
      if (host.querySelectorAll('select').length === 0) failures.push('no select found on Explore');
    } finally {
      host.remove();
      store.set(saved);
      if (original === null) document.documentElement.removeAttribute('data-theme');
      else document.documentElement.setAttribute('data-theme', original);
    }
    const note = state.skipped > 0 ? `; ${state.skipped} stylesheet(s) could not be read and were skipped` : '';
    assert.equal(failures.length, 0, `${failures.join('; ')}${note}`);
  });
}
