// Zoom for a chart host: + / - / Reset buttons and a two-pointer pinch. Zoom changes the rendered size of the
// svg (width = base width x factor, height from the viewBox aspect). The host scrolls natively in both axes,
// which is the pan. The viewBox is not changed. The maths is in pure functions so Node tests can check it.

export function clampFactor(factor, min, max) {
  return Math.min(max, Math.max(min, factor));
}

// Factor for the current finger distance, relative to the distance when the pinch started.
export function pinchFactor(startFactor, startDist, curDist, min, max) {
  if (!(startDist > 0)) return clampFactor(startFactor, min, max);
  return clampFactor(startFactor * curDist / startDist, min, max);
}

// New scroll offset that keeps the content point under `focal` (host coordinates) at the same place on screen.
// Content coordinate = (scroll + focal) / oldFactor, so the new scroll = content x newFactor - focal.
export function scrollForFocal(scroll, focal, oldFactor, newFactor) {
  if (!(oldFactor > 0)) return scroll;
  return Math.max(0, ((scroll + focal) * newFactor) / oldFactor - focal);
}

export function attachZoom(host, cfg) {
  let factor = 1;
  let svg = null;
  let baseWidth = 0;
  let aspect = 1;

  // The base width is the CSS width set by sizeSvg before refresh() runs; it is cached per svg element.
  function current() {
    const el = host.querySelector('svg');
    if (!el) return null;
    if (el !== svg) {
      svg = el;
      const [, , vbWidth, vbHeight] = el.getAttribute('viewBox').split(/\s+/).map(Number);
      aspect = vbHeight / vbWidth;
      baseWidth = parseFloat(el.style.width) || vbWidth;
    }
    return el;
  }

  function setFactor(next, focalX, focalY) {
    const el = current();
    if (!el) return;
    const prev = factor;
    factor = clampFactor(next, cfg.min, cfg.max);
    const left = scrollForFocal(host.scrollLeft, focalX, prev, factor);
    const top = scrollForFocal(host.scrollTop, focalY, prev, factor);
    el.style.width = `${baseWidth * factor}px`;
    el.style.height = `${baseWidth * factor * aspect}px`;
    host.scrollLeft = left;
    host.scrollTop = top;
  }

  function button(text, label, onClick) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = text;
    btn.setAttribute('aria-label', label);
    btn.addEventListener('click', onClick);
    return btn;
  }

  // Buttons keep the centre of the visible area fixed.
  function zoomBy(multiplier) {
    setFactor(factor * multiplier, host.clientWidth / 2, host.clientHeight / 2);
  }

  function reset() {
    setFactor(1, 0, 0);
    host.scrollLeft = 0;
    host.scrollTop = 0;
  }

  const bar = document.createElement('div');
  bar.className = 'row zoom-bar';
  bar.append(
    button('+', 'Zoom in', () => zoomBy(cfg.step)),
    button('-', 'Zoom out', () => zoomBy(1 / cfg.step)),
    button('Reset', 'Reset zoom', reset),
  );
  host.before(bar);

  // Pinch: pointer events for two pointers. Pointer capture keeps the events when a finger leaves the host.
  const pointers = new Map();
  let pinch = null;

  function spread() {
    const [a, b] = [...pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function midpoint() {
    const rect = host.getBoundingClientRect();
    const [a, b] = [...pointers.values()];
    return { x: (a.x + b.x) / 2 - rect.left, y: (a.y + b.y) / 2 - rect.top };
  }

  host.addEventListener('pointerdown', (event) => {
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    // Capture throws when the pointer is not active; the pinch still works without it, so the throw is ignored.
    try {
      host.setPointerCapture(event.pointerId);
    } catch {
      // no active pointer with this id
    }
    if (pointers.size === 2) pinch = { startDist: spread(), startFactor: factor };
  });

  host.addEventListener('pointermove', (event) => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (!pinch || pointers.size !== 2) return;
    const mid = midpoint();
    setFactor(pinchFactor(pinch.startFactor, pinch.startDist, spread(), cfg.min, cfg.max), mid.x, mid.y);
  });

  function release(event) {
    pointers.delete(event.pointerId);
    if (pointers.size < 2) pinch = null;
  }
  host.addEventListener('pointerup', release);
  host.addEventListener('pointercancel', release);

  // Re-applies the current factor to a newly drawn svg. A factor of 1 keeps the scroll offset unchanged.
  return { refresh: () => setFactor(factor, 0, 0) };
}
