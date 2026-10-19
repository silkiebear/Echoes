// Tools card: a deliberate error for checking the diagnostics redaction (moved from the Gallery in phase 4c, 4c.0.1).
// The demo label is registered at the click, not at mount, so synthetic text reaches a log only when the user asks.
// The registry already wraps the body in a card with the module title, so this file adds no heading of its own.
// The status line is an aria-live region; it reports the count after the error has been captured.
import { diagCheck as cfg } from '../config/explore.js';
import { moduleHelp, groupOf } from '../core/module-help.js';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export default {
  id: 'diag-check',
  title: cfg.title,
  phase: 4,
  order: 31,
  mount(container, ctx) {
    container.append(moduleHelp('diag-check'));
    const diag = ctx.diag;
    const note = groupOf('care', el('p', 'card-sub', cfg.note));
    const btn = el('button', null, cfg.button);
    btn.type = 'button';
    const status = el('p', 'card-sub');
    status.setAttribute('aria-live', 'polite');
    btn.addEventListener('click', () => {
      diag.register(cfg.demoLabel, 'label');
      setTimeout(() => {
        throw new Error(`${cfg.errorPrefix} ${cfg.demoLabel}`);
      }, 0);
      setTimeout(() => {
        status.textContent = cfg.recorded.replace('{count}', String(diag.totalErrors()));
      }, 0);
    });
    container.append(note, btn, status);
  },
};
