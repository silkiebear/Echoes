// Environment facts for diagnostics. Nothing here comes from the export.
// Every guard exists because Node (used by the tests) has no window or matchMedia.
import { version } from '../config/version.js';
import { assets as assetText } from '../config/assets.js';

// Browsers return a custom property with its quotes and spacing; both are removed before comparing.
function cleanCss(value) {
  return String(value).replace(/\s+/g, '').replace(/^["']|["']$/g, '');
}

export function compareBuild(cssValue, jsBuild) {
  if (cssValue === undefined || cssValue === null || !jsBuild) return 'unknown';
  const css = cleanCss(cssValue);
  if (css === '') return 'unknown';
  return css === String(jsBuild) ? 'ok' : 'stale';
}

export function assetStatus() {
  const readable = typeof document !== 'undefined' && typeof getComputedStyle === 'function';
  const raw = readable ? getComputedStyle(document.documentElement).getPropertyValue('--build') : undefined;
  const state = compareBuild(raw, version.build);
  if (state === 'ok') return { state, text: assetText.okText.replace('{build}', version.build) };
  if (state === 'stale') {
    const text = assetText.staleText.replace('{css}', cleanCss(raw)).replace('{js}', version.build);
    return { state, text };
  }
  return { state, text: assetText.unknownText };
}

function prefersScheme() {
  if (typeof matchMedia !== 'function') return 'n/a';
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function storageAvailable() {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    const key = '__echoes_probe__';
    window.localStorage.setItem(key, '1');
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function describeEnvironment() {
  const nav = typeof navigator !== 'undefined' ? navigator : {};
  const win = typeof window !== 'undefined' ? window : null;
  return {
    userAgent: nav.userAgent || 'unknown',
    platform: nav.platform || 'unknown',
    viewport: win ? `${win.innerWidth}x${win.innerHeight}` : 'n/a',
    devicePixelRatio: win ? win.devicePixelRatio : 'n/a',
    colorScheme: prefersScheme(),
    language: nav.language || 'unknown',
    online: typeof nav.onLine === 'boolean' ? nav.onLine : 'unknown',
    localStorage: storageAvailable(),
    blob: typeof Blob === 'function',
    share: typeof nav.share === 'function',
    clipboard: Boolean(nav.clipboard && typeof nav.clipboard.writeText === 'function'),
    assets: assetStatus().text,
  };
}
