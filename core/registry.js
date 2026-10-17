// Module loader. The contract (SPEC section 5): default export with id, title,
// phase, order and mount(container, ctx). Rejected modules are logged, never mounted.
import { log } from './diag.js';

const CONTRACT_FIELDS = ['id', 'title', 'phase', 'order', 'mount'];

function errorText(err) {
  return err && err.message ? err.message : String(err);
}

function contractProblem(mod) {
  if (!mod || typeof mod !== 'object') return 'default export is not an object';
  for (const field of CONTRACT_FIELDS) {
    if (mod[field] === undefined || mod[field] === null) return `missing field: ${field}`;
  }
  if (typeof mod.id !== 'string' || mod.id.length === 0) return 'id must be a non-empty string';
  if (typeof mod.title !== 'string') return 'title must be a string';
  if (!Number.isInteger(mod.phase)) return 'phase must be an integer';
  if (typeof mod.order !== 'number' || !Number.isFinite(mod.order)) return 'order must be a finite number';
  if (typeof mod.mount !== 'function') return 'mount must be a function';
  return null;
}

// Pure check: candidates are { source, mod }. Returns accepted modules sorted by order, plus rejections.
export function checkModules(candidates) {
  const modules = [];
  const errors = [];
  const seen = new Set();
  for (const { source, mod } of candidates) {
    const problem = contractProblem(mod);
    if (problem) {
      errors.push({ source, reason: problem });
      continue;
    }
    if (seen.has(mod.id)) {
      errors.push({ source, reason: `duplicate id "${mod.id}"` });
      continue;
    }
    seen.add(mod.id);
    modules.push(mod);
  }
  modules.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  return { modules, errors };
}

export async function loadModules(list, baseUrl) {
  const candidates = [];
  const importErrors = [];
  for (const source of list) {
    try {
      const ns = await import(new URL(source, baseUrl).href);
      candidates.push({ source, mod: ns.default });
    } catch (err) {
      importErrors.push({ source, reason: `import failed: ${errorText(err)}` });
    }
  }
  const checked = checkModules(candidates);
  const errors = [...importErrors, ...checked.errors];
  for (const e of errors) log('ERROR', `module rejected: ${e.source}: ${e.reason}`);
  return { modules: checked.modules, errors };
}

// panelFor(mod) picks the element a module is mounted into (its tab panel); default: the container.
export async function mountAll(container, ctx, modules, panelFor = () => container) {
  for (const mod of modules) {
    const section = document.createElement('section');
    section.className = 'card';
    section.dataset.module = mod.id;
    section.dataset.anchor = mod.id;
    const heading = document.createElement('h2');
    heading.textContent = mod.title;
    const body = document.createElement('div');
    section.append(heading, body);
    panelFor(mod).append(section);
    try {
      await mod.mount(body, ctx);
    } catch (err) {
      log('ERROR', `module ${mod.id} failed to mount: ${errorText(err)}`);
      body.textContent = 'This module failed to load. See diagnostics.';
    }
  }
}
