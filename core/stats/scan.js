// Cell scan (decisions D2 to D4). Loop order: window, outcome (masks computed once per pair), exposure.
// Every tested cell counts toward m; cells with p <= pKeep are kept with their counts for the FDR step in run.js.
import { fisherTwoSided } from './exact.js';
import { outcomeMasks, exposedCounts } from './cell-counts.js';

const now = () => performance.now();

function defaultYield() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// Shared by the scan and the later stages. tick() yields and polls shouldCancel once a chunk has elapsed (or
// at once when forced). report() sends a progress event and then checks, so a cancel right after a progress event
// is seen without waiting for the next chunk.
export function makeCheckpoint(hooks, chunkMs) {
  const yieldFn = hooks.yield || defaultYield;
  const state = { last: now(), cancelled: false };
  state.tick = async (force = false) => {
    if (state.cancelled) return true;
    if (!force && now() - state.last < chunkMs) return false;
    await yieldFn();
    state.last = now();
    if (hooks.shouldCancel && hooks.shouldCancel()) state.cancelled = true;
    return state.cancelled;
  };
  state.report = async (stage, fraction) => {
    if (hooks.progress) hooks.progress(stage, fraction);
    return state.tick(true);
  };
  return state;
}

// hooks.onCell (optional) receives every tested cell; the tests use it to check counts that are not kept.
export async function scanCells(p, cfg, hooks = {}) {
  const gate = makeCheckpoint(hooks, cfg.progress.chunkMs);
  const out = { kept: [], tested: 0, untested: 0, cancelled: false };
  const withDays = [];
  for (let id = 0; id < p.labelCount; id += 1) if (p.labelDays[id].length) withDays.push(id);
  const W = cfg.windows.length;
  for (let wi = 0; wi < W; wi += 1) {
    const w = cfg.windows[wi].days;
    for (const o of withDays) {
      const masks = outcomeMasks(p, o, w, cfg.minWindowCoverage);
      if (masks.K < cfg.minBaseHits || masks.K >= masks.N) {
        out.untested += withDays.length - (cfg.includeSelf ? 0 : 1);
      } else {
        for (const e of withDays) {
          if (e === o && !cfg.includeSelf) continue;
          const { n, k } = exposedCounts(p, e, masks);
          if (n < cfg.minExposed) {
            out.untested += 1;
            continue;
          }
          out.tested += 1;
          const pv = fisherTwoSided(k, n, masks.K, masks.N);
          if (hooks.onCell) hooks.onCell({ e, o, wi, k, n, K: masks.K, N: masks.N, p: pv });
          if (pv <= cfg.pKeep) out.kept.push({ e, o, wi, k, n, K: masks.K, N: masks.N, p: pv });
        }
      }
      if (await gate.tick()) {
        out.cancelled = true;
        return out;
      }
    }
    if (await gate.report('scan', (wi + 1) / W)) {
      out.cancelled = true;
      return out;
    }
  }
  return out;
}
