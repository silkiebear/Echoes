export default {
  id: 'status',
  title: 'Status',
  phase: 0,
  order: 10,
  mount(container, ctx) {
    const summary = document.createElement('p');
    summary.textContent = `${ctx.config.name}, phase ${ctx.version.phase}, build ${ctx.version.build}.`;
    const note = document.createElement('p');
    note.className = 'status-line';
    note.textContent = 'Data stays in this browser tab. Nothing is uploaded.';
    const list = document.createElement('ul');
    list.className = 'plain';
    for (const mod of ctx.modules) {
      const item = document.createElement('li');
      item.textContent = `${mod.title} (${mod.id}, phase ${mod.phase})`;
      list.append(item);
    }
    container.append(summary, note, list);
  },
};
