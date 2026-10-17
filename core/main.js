import { app } from '../config/app.js';
import { version } from '../config/version.js';
import * as diag from './diag.js';
import * as registry from './registry.js';
import { modules as manifest } from '../modules/manifest.js';
import { tabs, tabSettings } from '../config/tabs.js';
import { buildTabs, checkTabs, initialTab, placeModules, readStoredTab } from './tabs.js';
import { trackAnchor } from './scroll-anchor.js';

const THEME_KEY = 'echoes.theme';

// Dark unless the user chose light. The OS light preference is ignored on purpose.
const DEFAULT_THEME = 'dark';

function currentTheme() {
  return document.documentElement.dataset.theme || DEFAULT_THEME;
}

function labelFor(theme) {
  return theme === 'dark' ? 'Light mode' : 'Dark mode';
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.getElementById('theme-toggle').textContent = labelFor(theme);
}

function initTheme() {
  const toggle = document.getElementById('theme-toggle');
  let saved = null;
  try {
    saved = window.localStorage.getItem(THEME_KEY);
  } catch {
    saved = null; // storage can be blocked; the theme still works for this page view
  }
  if (saved === 'light' || saved === 'dark') setTheme(saved);
  else toggle.textContent = labelFor(currentTheme());
  toggle.addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try {
      window.localStorage.setItem(THEME_KEY, next);
    } catch {
      // Not persisted; the choice still applies until reload.
    }
  });
}

async function start() {
  diag.captureErrors();
  initTheme();
  const { modules, errors } = await registry.loadModules(manifest, new URL('../modules/', import.meta.url));
  const ctx = { config: app, diag, registry, version, modules };
  const ids = modules.map((mod) => mod.id);
  const check = checkTabs(tabs, ids, tabSettings);
  for (const problem of check.errors) diag.log('ERROR', `tab map: ${problem}`);
  if (check.unlisted.length) diag.logStatic('WARN', 'modules not in tab map', { count: check.unlisted.length });
  const placement = placeModules(tabs, ids, tabSettings.unlistedTab);
  const state = {
    active: initialTab(tabs.map((tab) => tab.id), readStoredTab(tabSettings.storageKey), tabSettings.defaultTab),
    storageKey: tabSettings.storageKey,
  };
  const host = document.getElementById('app');
  const nav = buildTabs(host, tabs, state, {
    label: tabSettings.ui.label,
    warning: check.unlisted.length ? tabSettings.ui.warning : null,
  });
  await registry.mountAll(host, ctx, modules, (mod) => nav.panelFor(placement.get(mod.id)));
  nav.show(state.active);
  trackAnchor(host);
  diag.logStatic('INFO', 'started build', { build: version.build, modules: modules.length, rejected: errors.length });
}

start();
