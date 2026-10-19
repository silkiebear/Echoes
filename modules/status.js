import { assetStatus } from '../core/env.js';
import { assets as assetText } from '../config/assets.js';
import { moduleHelp } from '../core/module-help.js';

const SENTENCE_BY_STATE = { ok: assetText.statusOk, stale: assetText.statusStale };

export default {
  id: 'status',
  title: 'Status',
  phase: 0,
  order: 10,
  mount(container, ctx) {
    const summary = document.createElement('p');
    summary.textContent = `${ctx.config.name}, version ${ctx.version.build}.`;
    const note = document.createElement('p');
    note.className = 'status-line';
    note.textContent = 'Data stays in this browser tab. Nothing is uploaded.';
    const list = document.createElement('ul');
    list.className = 'plain';
    for (const mod of ctx.modules) {
      const item = document.createElement('li');
      item.textContent = mod.title;
      list.append(item);
    }
    const assets = assetStatus();
    const assetLine = document.createElement('p');
    assetLine.textContent = SENTENCE_BY_STATE[assets.state] ?? assetText.statusUnknown;
    container.append(moduleHelp('status'), summary, note, assetLine, list);
  },
};
