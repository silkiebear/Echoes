// Scroll anchor for rotation and window resize (tier 4a.2). Scroll events record the element at the top of the
// viewport. The first width change of a burst freezes that record, because the browser may already have moved the
// scroll position. restoreAnchor() runs after the charts redraw (gallery-kit) and puts the element back at its
// recorded offset. A tab switch does not change the window width, so it never freezes and is not affected.
// UNVERIFIED on a phone: whether the browser moves the position before or after the resize event, and whether the
// redraw changes the page height enough to clamp the position.
const state = { id: null, offset: 0, frozen: false, width: 0, scheduled: false };

// Items are in document order. Returns the first item whose bottom is below viewportTop, or null.
export function pickAnchor(items, viewportTop) {
  const hit = items.find((item) => item.bottom > viewportTop);
  return hit ? hit.id : null;
}

// Scroll amount that moves an element from actualTop to wantedTop: positive scrolls down.
export function deltaFor(wantedTop, actualTop) {
  return actualTop - wantedTop;
}

export function freezeAnchor() {
  state.frozen = true;
}

function record(root) {
  state.scheduled = false;
  if (state.frozen) return;
  // Innermost anchors only: a module section that holds chart cards is not an anchor by itself.
  const nodes = [...root.querySelectorAll('[data-anchor]')].filter((node) => !node.querySelector('[data-anchor]'));
  const items = nodes.map((node) => {
    const rect = node.getBoundingClientRect();
    return { id: node.dataset.anchor, top: rect.top, bottom: rect.bottom };
  });
  const id = pickAnchor(items, 0);
  if (id === null) return;
  state.id = id;
  state.offset = items.find((item) => item.id === id).top;
}

export function trackAnchor(root) {
  state.width = window.innerWidth;
  const schedule = () => {
    if (state.scheduled) return;
    state.scheduled = true;
    requestAnimationFrame(() => record(root));
  };
  const burst = () => {
    if (window.innerWidth !== state.width) state.frozen = true;
  };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', burst);
  window.addEventListener('orientationchange', burst);
  schedule();
}

// No-op without a freeze, so only a width change restores the position.
export function restoreAnchor(root) {
  if (!state.frozen) return;
  state.frozen = false;
  state.width = window.innerWidth;
  const node = state.id === null ? null : [...root.querySelectorAll('[data-anchor]')].find((n) => n.dataset.anchor === state.id);
  if (node) window.scrollBy(0, deltaFor(state.offset, node.getBoundingClientRect().top));
}
