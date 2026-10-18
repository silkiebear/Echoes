// Explore periodic cards P1 to P4 at 320 px, dark and light (browser only; phase 4c, 4c.3). Synthetic data goes through the
// same parse path as a real load and is put into the live store only for this test; the store is restored afterwards.
// Checks: four cards draw SVG, no black default fill, the low time-of-day pill is absent for varied times and present
// for a single timestamp (the existing flag code), and the P3 and P4 notes state the days present.
import { test, skip, assert } from '../core/harness.js';
import * as store from '../core/store.js';
import { exportText } from '../core/synth-export.js';
import { parseExport } from '../core/export-parse.js';
import { synth as synthConfig } from '../config/synth.js';
import { parser } from '../config/parser.js';
import { viewSettings } from '../config/views.js';
import periodic from '../modules/explore-periodic.js';

const WIDTH = 320;
const BLACK = 'rgb(0, 0, 0)';
const PILL = viewSettings.time.periodic.pillText;
const PICK = [0, 1, 2];

function parsedWith(config) {
  return parseExport(exportText(config, {}), parser).data;
}

if (typeof document === 'undefined') {
  skip('explore periodic cards at 320 px: four cards, no black fill, pill present for a single timestamp and absent for varied times', 'browser only');
} else {
  test('explore periodic cards at 320 px: no black fill, pill only for a single timestamp, days present in the notes; store restored', () => {
    const saved = { data: store.get().data, parseStats: store.get().parseStats, selection: store.get().selection };
    const original = document.documentElement.getAttribute('data-theme');
    const host = document.createElement('section');
    host.style.width = `${WIDTH}px`;
    document.body.append(host);
    const failures = [];
    const cardsOf = () => [...host.querySelectorAll('section.card')];
    const pillCount = () => cardsOf().filter((c) => c.textContent.includes(PILL)).length;
    try {
      const varied = parsedWith(synthConfig);
      store.set({ data: varied, parseStats: null, selection: PICK.filter((id) => id < varied.labels.length) });
      periodic.mount(host, {});

      if (cardsOf().length !== 4) failures.push(`${cardsOf().length} periodic cards, expected 4`);
      for (const theme of ['dark', 'light']) {
        if (theme === 'dark') document.documentElement.removeAttribute('data-theme');
        else document.documentElement.setAttribute('data-theme', 'light');
        if (host.scrollWidth > host.clientWidth) failures.push(`${theme}: sideways scroll`);
        for (const card of cardsOf()) {
          const svg = card.querySelector('svg');
          const name = card.querySelector('h2').textContent;
          if (!svg) {
            failures.push(`${theme}: ${name} drew no SVG`);
            continue;
          }
          const black = [...svg.querySelectorAll('rect, path')].filter((n) => getComputedStyle(n).fill === BLACK).length;
          if (black > 0) failures.push(`${theme}: ${name} has ${black} shapes with the black default fill`);
        }
      }
      if (pillCount() !== 0) failures.push(`varied times: ${pillCount()} cards show the pill`);

      const profileNotes = cardsOf().filter((c) => /P3|P4/.test(c.querySelector('h2').textContent));
      for (const card of profileNotes) {
        if (!card.querySelector('p.card-sub').textContent.includes('Days present in total:')) {
          failures.push(`${card.querySelector('h2').textContent}: the note lacks the days present`);
        }
      }

      const single = parsedWith({ ...synthConfig, timeOfDay: { ...synthConfig.timeOfDay, mode: 'single' } });
      store.set({ data: single, parseStats: null, selection: PICK.filter((id) => id < single.labels.length) });
      if (pillCount() < 2) failures.push(`single timestamp: ${pillCount()} cards show the pill, expected P1 and P2`);
    } finally {
      host.remove();
      store.set(saved);
      if (original === null) document.documentElement.removeAttribute('data-theme');
      else document.documentElement.setAttribute('data-theme', original);
    }
    assert.ok(failures.length === 0, failures.join('; '));
  });
}
