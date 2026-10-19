// Help blocks of the Data and Tools modules at 320 px, dark and light (browser only; phase 4f.3.4). Each module card has a
// collapsed "How to read this" block whose toggle is at least 44 px and sets aria-expanded; opened, it shows four captioned
// parts; no sideways scroll. The store and the theme are restored afterwards.
import { test, skip, assert } from '../core/harness.js';
import * as store from '../core/store.js';
import * as diag from '../core/diag.js';
import { app } from '../config/app.js';
import { version } from '../config/version.js';
import { exploreHelp } from '../config/explore-help.js';
import statusMod from '../modules/status.js';
import dataMod from '../modules/data-load.js';
import moodMod from '../modules/mood-setup.js';
import q1Mod from '../modules/q1-coverage.js';
import q2Mod from '../modules/q2-label-coding.js';
import selfMod from '../modules/selftest-panel.js';
import diagMod from '../modules/diag-panel.js';
import diagCheckMod from '../modules/diag-check.js';
import privacyMod from '../modules/privacy-probe.js';
import scanMod from '../modules/echo-scan.js';

const WIDTH = 320;
const MIN_TARGET = 44;
const PARTS = ['what', 'how', 'numbers', 'care'];
const MODULES = [
  [statusMod, 'status'],
  [dataMod, 'data-load'],
  [moodMod, 'mood-setup'],
  [q1Mod, 'q1-coverage'],
  [q2Mod, 'q2-label-coding'],
  [selfMod, 'selftest-panel'],
  [diagMod, 'diag-panel'],
  [diagCheckMod, 'diag-check'],
  [privacyMod, 'privacy-probe'],
  [scanMod, 'echo-scan'],
];

if (typeof document === 'undefined') {
  skip('Data and Tools help blocks at 320 px: toggles, four parts, no sideways scroll; store restored', 'browser only');
} else {
  test('Data and Tools help blocks at 320 px: each module opens four captioned parts; toggles 44 px; no sideways scroll; store restored', () => {
    const saved = {
      data: store.get().data,
      parseStats: store.get().parseStats,
      selection: store.get().selection,
      pair: store.get().pair,
      scanResult: store.get().scanResult,
      settings: store.get().settings,
    };
    const original = document.documentElement.getAttribute('data-theme');
    const host = document.createElement('section');
    host.style.width = `${WIDTH}px`;
    document.body.append(host);
    const failures = [];
    try {
      const ctx = { config: app, version, modules: [], diag };
      for (const [mod, id] of MODULES) {
        const box = document.createElement('section');
        box.className = 'card';
        host.append(box);
        mod.mount(box, ctx);
        const block = box.querySelector('.help');
        if (!block) {
          failures.push(`${id}: no help block`);
          continue;
        }
        const toggle = block.querySelector('.help-toggle');
        const height = toggle.getBoundingClientRect().height;
        if (!(height >= MIN_TARGET)) failures.push(`${id}: toggle ${height} px tall`);
        if (toggle.getAttribute('aria-expanded') !== 'false') failures.push(`${id}: starts open`);
        toggle.click();
        if (toggle.getAttribute('aria-expanded') !== 'true') failures.push(`${id}: did not open`);
        const groups = [...block.querySelectorAll('.help-body .grp')];
        if (groups.length !== PARTS.length) failures.push(`${id}: ${groups.length} parts, want ${PARTS.length}`);
        PARTS.forEach((part, i) => {
          const caption = groups[i]?.querySelector('.grp-caption');
          if (!caption || caption.textContent !== exploreHelp.captions[part]) failures.push(`${id}: part ${part} caption`);
        });
        toggle.click();
        if (toggle.getAttribute('aria-expanded') !== 'false') failures.push(`${id}: did not close`);
      }
      for (const theme of ['dark', 'light']) {
        if (theme === 'dark') document.documentElement.removeAttribute('data-theme');
        else document.documentElement.setAttribute('data-theme', 'light');
        if (host.scrollWidth > host.clientWidth) failures.push(`${theme}: sideways scroll ${host.scrollWidth} > ${host.clientWidth}`);
      }
    } finally {
      host.remove();
      store.set(saved);
      if (original === null) document.documentElement.removeAttribute('data-theme');
      else document.documentElement.setAttribute('data-theme', original);
    }
    assert.equal(failures.length, 0, failures.join('; '));
  });
}
