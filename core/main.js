import { app } from '../config/app.js';
import { version } from '../config/version.js';
import * as diag from './diag.js';
import * as registry from './registry.js';
import { modules as manifest } from '../modules/manifest.js';

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
  await registry.mountAll(document.getElementById('app'), ctx, modules);
  diag.log('INFO', `started build ${version.build}: ${modules.length} modules, ${errors.length} rejected`);
}

start();
