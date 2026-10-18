// Plain-language Echo scan card at 320 px, dark and light (browser only; phase 4c, 4c.0b). Checks the how-to block,
// the verdicts, the technical toggle, sideways scroll, 44 px targets, and that the default view has no statistics words.
import { test, skip, assert } from '../core/harness.js';
import * as diag from '../core/diag.js';
import * as store from '../core/store.js';
import { stats } from '../config/stats.js';
import echoScan from '../modules/echo-scan.js';

const WIDTH = 320;
const MIN_TARGET = 44;
const WAIT_STEP_MS = 100;
const WAIT_LIMIT_MS = 120000;

function waitFor(check) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      const found = check();
      if (found) resolve(found);
      else if (Date.now() - started > WAIT_LIMIT_MS) reject(new Error('scan did not finish in time'));
      else setTimeout(tick, WAIT_STEP_MS);
    };
    tick();
  });
}

function buttonNamed(card, text) {
  return [...card.querySelectorAll('button')].find((b) => b.textContent === text);
}

if (typeof document === 'undefined') {
  skip('plain card at 320 px: how-to block, verdicts, technical toggle, no sideways scroll, 44 px targets, no statistics words by default', 'browser only');
} else {
  test('plain card at 320 px: how-to block opens and closes, verdicts, technical toggle, no sideways scroll, 44 px targets, no statistics words by default', async () => {
    const ui = stats.ui;
    const liveData = store.get().data;
    const original = document.documentElement.getAttribute('data-theme');
    const card = document.createElement('section');
    card.className = 'card';
    card.style.width = `${WIDTH}px`;
    document.body.append(card);
    const failures = [];
    const banned = /rate ratio|FDR|\bq\s|placebo|p-value|significant|stratified|Mantel|autocorrelation/i;
    const items = () => card.querySelectorAll('.scan-item').length;
    const technical = () => card.querySelectorAll('.scan-item .scan-item-metrics').length;
    const technicalToggle = () => [...card.querySelectorAll('label.check')].find((l) => l.textContent === ui.technical.toggle);
    try {
      echoScan.mount(card, { diag });
      const sourceSel = card.querySelector(`select[aria-label="${ui.labels.source}"]`);
      sourceSel.value = 'wide';
      sourceSel.dispatchEvent(new Event('change'));
      buttonNamed(card, ui.run).click();
      await waitFor(() => card.querySelector('.scan-list, .scan-notice'));

      const details = card.querySelector('details.scan-help-block');
      if (!details) failures.push('no how-to block');
      else {
        if (details.open) failures.push('how-to block is open by default');
        if (card.querySelector('.scan-result').firstElementChild !== details) failures.push('how-to block is not at the top of the results');
        details.open = true;
        if (!details.open) failures.push('how-to block did not open');
        details.open = false;
        if (details.open) failures.push('how-to block did not close');
      }

      const verdicts = card.querySelectorAll('.scan-verdict');
      if (items() === 0) failures.push('no items');
      if (verdicts.length !== items()) failures.push(`${verdicts.length} verdicts for ${items()} items`);
      const kinds = new Set([...verdicts].map((v) => v.className.split(' ').find((c) => c.startsWith('scan-verdict-'))));
      if (kinds.size === 0) failures.push('no verdict kind class');

      if (technical() !== 0) failures.push('technical lines shown by default');
      const toggle = technicalToggle();
      if (!toggle) failures.push('no technical toggle');
      else {
        const box = toggle.querySelector('input');
        box.checked = true;
        box.dispatchEvent(new Event('change'));
        if (technical() !== items()) failures.push(`toggle on: ${technical()} technical lines for ${items()} items`);
        box.checked = false;
        box.dispatchEvent(new Event('change'));
        if (technical() !== 0) failures.push('technical lines remain after the toggle is off');
      }

      const hit = card.textContent.match(banned);
      if (hit) failures.push(`statistics word in the default view: ${hit[0]}`);

      for (const theme of ['dark', 'light']) {
        if (theme === 'dark') document.documentElement.removeAttribute('data-theme');
        else document.documentElement.setAttribute('data-theme', 'light');
        if (card.scrollWidth > card.clientWidth) failures.push(`${theme}: card scrolls sideways`);
        const targets = card.querySelectorAll('.scan-row button, .scan-row select, label.check, .scan-help-summary, .scan-list ~ button');
        for (const target of targets) {
          const height = target.getBoundingClientRect().height;
          if (!(height >= MIN_TARGET)) failures.push(`${theme}: ${target.tagName} ${target.textContent.slice(0, 30)} is ${height} px tall`);
        }
      }
    } finally {
      card.remove();
      if (original === null) document.documentElement.removeAttribute('data-theme');
      else document.documentElement.setAttribute('data-theme', original);
    }
    assert.ok(store.get().data === liveData, 'live store data unchanged');
    assert.ok(failures.length === 0, failures.join('; '));
  });
}
