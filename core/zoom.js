// Zoom buttons for the SVG inside `host`. Zoom changes the viewBox only (centred), so the
// CSS size stays the same. Pinch zoom is not in this phase (deferred to 1b).
export function attachZoom(host, cfg) {
  let scale = 1;

  function apply() {
    const svg = host.querySelector('svg');
    if (!svg) return;
    if (!svg.dataset.baseViewbox) svg.dataset.baseViewbox = svg.getAttribute('viewBox');
    const [x, y, w, h] = svg.dataset.baseViewbox.split(/\s+/).map(Number);
    const vw = w / scale;
    const vh = h / scale;
    svg.setAttribute('viewBox', `${x + (w - vw) / 2} ${y + (h - vh) / 2} ${vw} ${vh}`);
  }

  function button(text, label, onClick) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = text;
    btn.setAttribute('aria-label', label);
    btn.addEventListener('click', () => {
      onClick();
      apply();
    });
    return btn;
  }

  const bar = document.createElement('div');
  bar.className = 'row zoom-bar';
  bar.append(
    button('+', 'Zoom in', () => { scale = Math.min(cfg.max, scale * cfg.step); }),
    button('-', 'Zoom out', () => { scale = Math.max(cfg.min, scale / cfg.step); }),
    button('Reset', 'Reset zoom', () => { scale = 1; }),
  );
  host.append(bar);
  return { refresh: apply };
}
