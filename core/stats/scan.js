// Cell scan (decisions D2 to D4, D11 to D15). Loop order: window, outcome (masks computed once per pair), exposure.
// Every tested cell counts toward m; cells with p <= pKeep are kept with their counts for the FDR step in run.js.
// cfg.scanTest 'stratified' (default): p is the stratified test with the autocorrelation inflation (stratified.js,
// strata.js), on counts restricted to the exposure's active period (cell-counts.js). 'fisher': the phase 3 pooled exact
// test on the full masks, kept so the gates can compare.
import { fisherTwoSided } from './exact.js';
import { outcomeMasks, exposedCounts, maskPrefixes, restrictedCell, restrictedCellBanded, bandTotals } from './cell-counts.js';
import { mantelHaenszel, inflationFactor, adjustedZ } from './stratified.js';
import { twoSidedP } from './normal.js';
import { strataGeometry, labelPhi, outcomePhi, stratumBands } from './strata.js';

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

// Phase 3 pair scan: pooled exact test on the full masks of the pair.
function fisherPair(p, cfg, masks, o, wi, withDays, out, hooks) {
  for (const e of withDays) {
    if (e === o && !cfg.includeSelf) continue;
    const { n, k } = exposedCounts(p, e, masks);
    if (n < cfg.minExposed) {
      out.untested += 1;
      continue;
    }
    out.tested += 1;
    const pv = fisherTwoSided(k, n, masks.K, masks.N);
    const rec = { e, o, wi, k, n, K: masks.K, N: masks.N, p: pv, pFisher: pv, rrAdj: null };
    if (hooks.onCell) hooks.onCell(rec);
    if (pv <= cfg.pKeep) out.kept.push(rec);
  }
}

// Stratified pair scan (D11 to D15): restricted cell counts, Mantel-Haenszel sums, variance inflation from the
// exposure and outcome lag-1 inputs. The exact p-value on the same restricted counts is kept as pFisher.
function stratifiedPair(p, cfg, geo, phiE, masks, o, wi, withDays, out, hooks) {
  const pre = maskPrefixes(masks, p.n);
  const phiO = outcomePhi(p, masks, geo);
  // Logging-volume bands (4d.3) count with per-stratum totals; one band keeps the 4b counting path unchanged.
  const totals = geo.bands > 1 ? bandTotals(p, masks, geo) : null;
  for (const e of withDays) {
    if (e === o && !cfg.includeSelf) continue;
    const cell = totals ? restrictedCellBanded(p, e, masks, totals, geo) : restrictedCell(p, e, masks, pre, geo);
    if (cell.n < cfg.minExposed || cell.K < cfg.minBaseHits || cell.K >= cell.N) {
      out.untested += 1;
      continue;
    }
    const mh = mantelHaenszel(cell.strata);
    if (mh.variance < cfg.minVariance) {
      out.untested += 1;
      continue;
    }
    out.tested += 1;
    const factor = inflationFactor(phiE[e], phiO, cfg.inflation.max);
    const pv = twoSidedP(adjustedZ(mh, factor));
    const rec = {
      e, o, wi, k: cell.k, n: cell.n, K: cell.K, N: cell.N, p: pv,
      pFisher: fisherTwoSided(cell.k, cell.n, cell.K, cell.N), rrAdj: mh.rrAdj,
    };
    if (hooks.onCell) hooks.onCell(rec);
    if (pv <= cfg.pKeep) out.kept.push(rec);
  }
}

// hooks.onCell (optional) receives every tested cell; the tests use it to check counts that are not kept.
export async function scanCells(p, cfg, hooks = {}) {
  const gate = makeCheckpoint(hooks, cfg.progress.chunkMs);
  const out = { kept: [], tested: 0, untested: 0, cancelled: false };
  const withDays = [];
  for (let id = 0; id < p.labelCount; id += 1) if (p.labelDays[id].length) withDays.push(id);
  const stratified = cfg.scanTest !== 'fisher';
  const geo = stratified ? strataGeometry(p, cfg.strata.days, stratumBands(cfg.strata)) : null;
  const phiE = stratified ? labelPhi(p, geo) : null;
  const W = cfg.windows.length;
  for (let wi = 0; wi < W; wi += 1) {
    const w = cfg.windows[wi].days;
    for (const o of withDays) {
      const masks = outcomeMasks(p, o, w, cfg.minWindowCoverage);
      // A pair with too few hits is skipped for every exposure. The stratified path leaves the K >= N case to the cell
      // check: restriction to an active period can remove hits, so a pair-level K >= N is not final there.
      const pairSkip = stratified
        ? masks.K < cfg.minBaseHits
        : masks.K < cfg.minBaseHits || masks.K >= masks.N;
      if (pairSkip) {
        out.untested += withDays.length - (cfg.includeSelf ? 0 : 1);
      } else if (stratified) {
        stratifiedPair(p, cfg, geo, phiE, masks, o, wi, withDays, out, hooks);
      } else {
        fisherPair(p, cfg, masks, o, wi, withDays, out, hooks);
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
