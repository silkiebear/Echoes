// Environment facts for diagnostics. Nothing here comes from the export.
// Every guard exists because Node (used by the tests) has no window or matchMedia.

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
  };
}
