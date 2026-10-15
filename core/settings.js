// Settings model: build defaults, validate a parsed export, and round-trip through storage.
// Validation never echoes field values into messages (SPEC 12), so a bad export cannot leak data.
import { settingsConfig as cfg } from '../config/settings.js';
import { viewSettings } from '../config/views.js';

const KNOWN_KEYS = ['version', 'moods', 'categories', 'groups', 'customAnalyses', 'observation', 'ui'];
const HEX = /^#[0-9a-f]{6}$/i;
const CODE = /^[A-Z0-9]$/;
const THEMES = ['dark', 'light'];

// A plain object is a non-null, non-array value. Used to reject null/array/string/number inputs.
function isPlain(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function defaultSettings() {
  return {
    version: cfg.version,
    moods: [],
    categories: cfg.categories.map((c) => ({ code: c.code, name: c.name, color: c.color })),
    groups: [],
    customAnalyses: [],
    observation: { trackerLabel: '' },
    ui: { theme: 'dark', weekStart: viewSettings.time.weekStart },
  };
}

function validateSettings(obj) {
  const errors = [];

  // 1. The whole input must be a JSON object; anything else is rejected wholesale.
  if (!isPlain(obj)) {
    return { settings: null, errors: ['settings: not a JSON object'] };
  }

  // 2. Version must be an integer >= 1; a future version is a hard stop.
  if (!Number.isInteger(obj.version) || obj.version < 1) {
    errors.push('version: missing or invalid');
  } else if (obj.version > cfg.version) {
    return { settings: null, errors: ['version: newer than this app supports'] };
  }

  // 3. Start from defaults; keep any unknown top-level keys untouched, force the version.
  const settings = defaultSettings();
  for (const key of Object.keys(obj)) {
    // "__proto__" from parsed JSON would set a prototype instead of a key, so it is never copied.
    if (KNOWN_KEYS.indexOf(key) === -1 && key !== '__proto__') {
      settings[key] = obj[key];
    }
  }
  settings.version = cfg.version;

  // 4. moods: each element must be a plain object with a trimmed name, an order >= 1, and a HEX colour.
  if (obj.moods !== undefined) {
    if (!Array.isArray(obj.moods)) {
      errors.push('moods: not an array');
    } else {
      const valid = [];
      obj.moods.forEach((el, i) => {
        const name = isPlain(el) ? el.name : undefined;
        const order = isPlain(el) ? el.order : undefined;
        const color = isPlain(el) ? el.color : undefined;
        let ok = true;
        if (!(typeof name === 'string' && name.trim() !== '')) {
          errors.push(`moods[${i}].name: missing or invalid`);
          ok = false;
        }
        if (!(Number.isInteger(order) && order >= 1)) {
          errors.push(`moods[${i}].order: missing or invalid`);
          ok = false;
        }
        if (!(typeof color === 'string' && HEX.test(color))) {
          errors.push(`moods[${i}].color: missing or invalid`);
          ok = false;
        }
        if (ok) {
          valid.push({ name: name.trim(), order, color });
        }
      });
      settings.moods = valid;
    }
  }

  // 5. categories: keep the defaults unless a valid array overrides them.
  if (obj.categories !== undefined) {
    if (!Array.isArray(obj.categories)) {
      errors.push('categories: not an array');
    } else {
      const valid = [];
      obj.categories.forEach((el, i) => {
        const code = isPlain(el) ? el.code : undefined;
        const name = isPlain(el) ? el.name : undefined;
        const color = isPlain(el) ? el.color : undefined;
        let ok = true;
        if (!(typeof code === 'string' && CODE.test(code))) {
          errors.push(`categories[${i}].code: missing or invalid`);
          ok = false;
        }
        if (!(typeof name === 'string' && name.trim() !== '')) {
          errors.push(`categories[${i}].name: missing or invalid`);
          ok = false;
        }
        if (!(typeof color === 'string' && HEX.test(color))) {
          errors.push(`categories[${i}].color: missing or invalid`);
          ok = false;
        }
        if (ok) {
          valid.push({ code, name: name.trim(), color });
        }
      });
      settings.categories = valid;
    }
  }

  // 6. groups and customAnalyses: keep as-is when arrays, otherwise keep the empty default.
  ['groups', 'customAnalyses'].forEach((key) => {
    if (obj[key] !== undefined && !Array.isArray(obj[key])) {
      errors.push(`${key}: not an array`);
    } else if (Array.isArray(obj[key])) {
      settings[key] = obj[key];
    }
  });

  // 7. observation: a plain object whose trackerLabel is a string, else the default.
  if (obj.observation !== undefined) {
    if (!isPlain(obj.observation)) {
      errors.push('observation: not an object');
    } else if (typeof obj.observation.trackerLabel !== 'string') {
      errors.push('observation.trackerLabel: missing or invalid');
      settings.observation = { trackerLabel: '' };
    } else {
      settings.observation = { trackerLabel: obj.observation.trackerLabel };
    }
  }

  // 8. ui: theme from THEMES (else dark), weekStart an integer 0-6 (else the view default).
  if (obj.ui !== undefined) {
    if (!isPlain(obj.ui)) {
      errors.push('ui: not an object');
    } else {
      let theme = 'dark';
      if (THEMES.indexOf(obj.ui.theme) !== -1) {
        theme = obj.ui.theme;
      } else {
        errors.push('ui.theme: missing or invalid');
      }
      let weekStart = viewSettings.time.weekStart;
      if (Number.isInteger(obj.ui.weekStart) && obj.ui.weekStart >= 0 && obj.ui.weekStart <= 6) {
        weekStart = obj.ui.weekStart;
      } else {
        errors.push('ui.weekStart: missing or invalid');
      }
      settings.ui = { theme, weekStart };
    }
  }

  return { settings, errors };
}

// Storage can be missing, blocked, or full; every failure path yields null rather than throwing.
function loadCached() {
  try {
    const raw = globalThis.localStorage.getItem(cfg.cacheKey);
    if (raw === null) {
      return null;
    }
    return validateSettings(JSON.parse(raw)).settings;
  } catch {
    return null;
  }
}

function saveCached(settings) {
  try {
    globalThis.localStorage.setItem(cfg.cacheKey, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}

function exportSettingsText(settings) {
  return JSON.stringify(settings, null, 2) + '\n';
}

export { defaultSettings, validateSettings, loadCached, saveCached, exportSettingsText };
