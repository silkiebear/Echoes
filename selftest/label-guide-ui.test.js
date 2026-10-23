// Label naming guide at 320 px, dark and light (browser only; phase 4f.1.4). The checker field is at least 44 px tall;
// typing "Late coffee Fb--" shows category F, subcategory b, value mark -- and status coded; typing "Tea fb-" shows
// no code; the help block opens with four captioned parts; there is no sideways scroll; the store is restored afterwards.
import { test, skip, assert } from '../core/harness.js';
import * as store from '../core/store.js';
import { defaultSettings } from '../core/settings.js';
import { labelGuide } from '../config/label-guide.js';
import * as guideMod from '../modules/label-guide.js';

const WIDTH = 320;
const MIN_TARGET = 44;
const PARTS = ['what', 'how', 'numbers', 'care'];
const FIELDS = ['name', 'category', 'sub', 'mark', 'status'];

if (typeof document === 'undefined') {
  skip('label naming guide at 320 px: checker, targets, no sideways scroll; store restored', 'browser only');
} else {
  test('label naming guide at 320 px: the checker reads typed labels; targets 44 px; no sideways scroll; store restored', () => {
    const saved = { settings: store.get().settings };
    const original = document.documentElement.getAttribute('data-theme');
    const host = document.createElement('section');
    host.style.width = `${WIDTH}px`;
    document.body.append(host);
    const failures = [];
    try {
      store.set({ settings: defaultSettings() });
      guideMod.default.mount(host, {});
      const card = host.querySelector('section.card');
      const input = host.querySelector('input.explore-input');
      const checkGroup = input.closest('label').parentElement;
      const result = checkGroup.querySelector('dl');
      const height = input.getBoundingClientRect().height;
      if (!(height >= MIN_TARGET)) failures.push(`checker field is ${height} px tall`);

      const typed = (text) => {
        input.value = text;
        input.dispatchEvent(new Event('input'));
        return [...result.querySelectorAll('dd')].map((dd) => dd.textContent);
      };
      const coded = typed('Late coffee Fb--');
      const want = ['Late coffee', 'F (emotions)', 'b', '-- (very bad)'];
      want.forEach((text, i) => {
        if (coded[i] !== text) failures.push(`${FIELDS[i]} shows "${coded[i]}", want "${text}"`);
      });
      if (!coded[4].startsWith('coded')) failures.push(`status shows "${coded[4]}", want coded`);
      const labels = [...result.querySelectorAll('dt')].map((dt) => dt.textContent);
      if (labels.join('|') !== FIELDS.map((f) => labelGuide.check.fields[f]).join('|')) failures.push(`field names ${labels.join('|')}`);

      const plain = typed('Tea fb-');
      if (plain[1] !== labelGuide.check.none) failures.push(`lowercase category shows "${plain[1]}"`);
      if (plain[4] !== labelGuide.check.status.uncoded) failures.push(`no-code status shows "${plain[4]}"`);
      typed('');
      if (!result.hidden) failures.push('empty field still shows a result');

      const toggle = card.querySelector('.help-toggle');
      if (!(toggle.getBoundingClientRect().height >= MIN_TARGET)) failures.push('help toggle is under 44 px');
      if (toggle.getAttribute('aria-expanded') !== 'false') failures.push('help block starts open');
      toggle.click();
      if (toggle.getAttribute('aria-expanded') !== 'true') failures.push('help block did not open');
      const groups = [...card.querySelectorAll('.help-body .grp')];
      if (groups.length !== PARTS.length) failures.push(`help has ${groups.length} parts, want ${PARTS.length}`);
      PARTS.forEach((part, i) => {
        const caption = groups[i]?.querySelector('.grp-caption');
        if (!caption || caption.textContent !== labelGuide.captions[part]) failures.push(`help part ${part} caption`);
      });
      toggle.click();
      if (toggle.getAttribute('aria-expanded') !== 'false') failures.push('help block did not close');

      for (const theme of ['dark', 'light']) {
        if (theme === 'dark') document.documentElement.removeAttribute('data-theme');
        else document.documentElement.setAttribute('data-theme', 'light');
        if (host.scrollWidth > host.clientWidth) failures.push(`${theme}: page sideways scroll ${host.scrollWidth} > ${host.clientWidth}`);
        if (card.scrollWidth > card.clientWidth) failures.push(`${theme}: card sideways scroll ${card.scrollWidth} > ${card.clientWidth}`);
        const cardBg = getComputedStyle(card).backgroundColor;
        for (const text of card.querySelectorAll('.grp-text')) {
          if (getComputedStyle(text).color === cardBg) failures.push(`${theme}: text colour equals the card background`);
        }
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
