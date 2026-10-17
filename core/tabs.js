// Tab bar and panels (SPEC 15). checkTabs, placeModules, nextTab, initialTab and withPanelVisible are pure and also run
// in Node. buildTabs and the storage helpers touch the DOM or window only when called.
// Tabs only show and hide panels: every module is mounted once (registry.mountAll), so shared state in core\store.js
// is visible in every tab.

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// Returns { errors, unlisted }. Messages carry config ids only.
export function checkTabs(tabs, moduleIds, { defaultTab, unlistedTab } = {}) {
  const errors = [];
  const tabIds = new Set();
  const home = new Map();
  for (const tab of tabs) {
    if (tabIds.has(tab.id)) errors.push(`duplicate tab id: ${tab.id}`);
    tabIds.add(tab.id);
    for (const mod of tab.modules) {
      if (!moduleIds.includes(mod)) errors.push(`unknown module id in tab ${tab.id}: ${mod}`);
      if (home.has(mod)) errors.push(`module ${mod} is in two tabs: ${home.get(mod)} and ${tab.id}`);
      else home.set(mod, tab.id);
    }
  }
  if (defaultTab !== undefined && !tabIds.has(defaultTab)) errors.push(`defaultTab ${defaultTab} is not a tab id`);
  if (unlistedTab !== undefined && !tabIds.has(unlistedTab)) errors.push(`unlistedTab ${unlistedTab} is not a tab id`);
  return { errors, unlisted: moduleIds.filter((id) => !home.has(id)) };
}

// Module id -> tab id. A module listed nowhere goes to unlistedTab, or to the first tab if that id is missing.
export function placeModules(tabs, moduleIds, unlistedTab) {
  const home = new Map();
  for (const tab of tabs) for (const mod of tab.modules) if (!home.has(mod)) home.set(mod, tab.id);
  const fallback = tabs.some((tab) => tab.id === unlistedTab) ? unlistedTab : tabs[0].id;
  return new Map(moduleIds.map((id) => [id, home.get(id) ?? fallback]));
}

// Keyboard movement on the tab bar. Arrows wrap; Home and End jump to the ends.
export function nextTab(ids, currentId, key) {
  if (ids.length === 0) return currentId;
  const i = Math.max(0, ids.indexOf(currentId));
  const last = ids.length - 1;
  if (key === 'Home') return ids[0];
  if (key === 'End') return ids[last];
  if (key === 'ArrowRight') return ids[i === last ? 0 : i + 1];
  if (key === 'ArrowLeft') return ids[i === 0 ? last : i - 1];
  return currentId;
}

// A stored id that no longer exists (tab renamed or removed) falls back to the default.
export function initialTab(ids, stored, fallback) {
  if (ids.includes(stored)) return stored;
  return ids.includes(fallback) ? fallback : ids[0];
}

// A hidden panel measures width 0, so charts must be measured while visible. `hidden` is restored in finally
// even when fn throws.
export async function withPanelVisible(panel, fn) {
  const wasHidden = panel.hidden;
  panel.hidden = false;
  try {
    return await fn();
  } finally {
    panel.hidden = wasHidden;
  }
}

// Storage can be blocked, so both helpers fail quietly; the tab then works for this page view only.
export function readStoredTab(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStoredTab(key, id) {
  try {
    window.localStorage.setItem(key, id);
  } catch {
    // Not persisted.
  }
}

// state = { active, storageKey (null = do not store) }. hooks = { label, warning, restoreScroll (default true) }.
// Panels are created hidden; call show(id) after the modules are mounted.
export function buildTabs(host, tabs, state, hooks = {}) {
  const ids = tabs.map((tab) => tab.id);
  const keepScroll = hooks.restoreScroll !== false;
  const bar = el('div', 'tab-bar');
  bar.setAttribute('role', 'tablist');
  if (hooks.label) bar.setAttribute('aria-label', hooks.label);
  const buttons = new Map();
  const panels = new Map();
  const scrollOf = new Map();

  function show(id) {
    if (!panels.has(id)) return;
    if (keepScroll && state.active !== id) scrollOf.set(state.active, window.scrollY);
    state.active = id;
    for (const tab of ids) {
      const on = tab === id;
      const btn = buttons.get(tab);
      btn.setAttribute('aria-selected', String(on));
      btn.tabIndex = on ? 0 : -1;
      panels.get(tab).hidden = !on;
    }
    if (state.storageKey) writeStoredTab(state.storageKey, id);
    // The resize event runs the debounced chart redraw, which measures the panel now that it is visible.
    window.dispatchEvent(new Event('resize'));
    if (keepScroll) window.scrollTo(0, scrollOf.get(id) ?? 0);
  }

  for (const tab of tabs) {
    const btn = el('button', 'tab', tab.title);
    btn.type = 'button';
    btn.id = `tab-${tab.id}`;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-controls', `panel-${tab.id}`);
    btn.addEventListener('click', () => show(tab.id));
    btn.addEventListener('keydown', (ev) => {
      const next = nextTab(ids, tab.id, ev.key);
      if (next === tab.id) return;
      ev.preventDefault();
      show(next);
      buttons.get(next).focus();
    });
    const panel = el('div', 'tab-panel');
    panel.id = `panel-${tab.id}`;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', btn.id);
    panel.hidden = true;
    buttons.set(tab.id, btn);
    panels.set(tab.id, panel);
    bar.append(btn);
  }

  if (hooks.warning) host.append(el('p', 'status-line', hooks.warning));
  host.append(bar, ...panels.values());
  return { show, panelFor: (id) => panels.get(id) };
}
