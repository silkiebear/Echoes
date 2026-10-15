// In-memory state for this tab: settings (restored from the cache when present), the loaded data and the parse
// stats. Only settings are cached (core/settings.js); loaded data is not kept after a reload.
import { defaultSettings, loadCached } from './settings.js';

const state = { settings: loadCached() ?? defaultSettings(), data: null, parseStats: null };
const listeners = new Set();

// Callers read the state and never write to it directly; changes go through set().
export function get() {
  return state;
}

export function set(partial) {
  Object.assign(state, partial);
  for (const listener of listeners) listener(state);
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
