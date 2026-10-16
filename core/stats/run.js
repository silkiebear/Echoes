// Scan entry point (decisions D5 to D10). runScan(input, options, hooks) -> Promise<result>.
//   input:   { data, settings }  (parsed export, or the synthetic wide sample with its settings)
//   options: { mode: 'fast' | 'deep', seed, runner, cfg, windows }  (defaults: config\stats.js, config\windows.js)
//   hooks:   { progress(stage, fraction), shouldCancel(), yield() }
//
// result = {
//   meta: { cellsTested, cellsUntested, kept, discoveries, discoveriesLongRuns, ms, runner, cancelled, seed },
//   rows: [{ exposure, outcome, window, n, k, K, N, rate, base, rr, diff, p, q,
//            placeboP, placeboPercentile, longRuns,
//            flags: { lowSample, failsFdr, failsTimeSplit, lowCompletenessSensitive, highAutocorrelation,
//                     newLabel, shortWindow, directionAmbiguity } }],
//   notices: [flag id]
// }
// exposure and outcome are label ids; window is a window id from config\windows.js. Every flag is true, false or null
// (null: not evaluated, which the top-K stages leave, and directionAmbiguity when the cell has no q). q is null when p
// is at or above stats.pKeep.
// longRuns: one label of the cell has a lag-1 correlation at or above stats.autocorr.threshold. Its q is not valid
// under the independence test, so discoveriesLongRuns counts those discoveries apart (the q values are unchanged).
// The result carries ids only, never label text. ms is wall-clock time, so it differs between runs.
import { stats } from '../../config/stats.js';
import { windows } from '../../config/windows.js';
import { flags as flagDefs } from '../../config/flags.js';
import { mulberry32 } from '../synth.js';
import { prepare } from './prepare.js';
import { scanCells, makeCheckpoint } from './scan.js';
import { bhOnKept } from './fdr.js';
import { rateStats } from './rate.js';
import { outcomeMasks } from './cell-counts.js';
import { placeboForCell } from './placebo-run.js';
import { timeSplitFails } from './timesplit.js';
import { lowCompletenessFlag, lowSampleFlag, shortWindowFlag, failsFdrFlag, newLabelFlag, highAutocorrelationFlag, directionAmbiguityFlag } from './flags.js';

const now = () => performance.now();
const keyOf = (e, o, wi) => `${e}:${o}:${wi}`;

// Ascending order where an undefined or null value sorts last.
function cmpNullLast(a, b) {
  if (a === null) return b === null ? 0 : 1;
  if (b === null) return -1;
  return a - b;
}

// Rank for the rows: q, then p, then |ln rr| descending (undefined ratios last), then ids so the order is fixed.
function rankCmp(a, b) {
  const lnA = a.rates.rr === null ? -Infinity : Math.abs(Math.log(a.rates.rr));
  const lnB = b.rates.rr === null ? -Infinity : Math.abs(Math.log(b.rates.rr));
  return cmpNullLast(a.q, b.q) || a.p - b.p || (lnB > lnA ? 1 : lnB < lnA ? -1 : 0)
    || a.e - b.e || a.o - b.o || a.wi - b.wi;
}

export async function runScan(input, options = {}, hooks = {}) {
  const started = now();
  const cfg = { ...(options.cfg || stats), windows: options.windows || windows };
  const mode = options.mode || 'fast';
  const seed = options.seed ?? cfg.placebo.seed;
  const runner = options.runner || 'main';
  const rnd = mulberry32(seed);
  const gate = makeCheckpoint(hooks, cfg.progress.chunkMs);
  const metaOf = (extra) => ({
    cellsTested: 0, cellsUntested: 0, kept: 0, discoveries: 0, discoveriesLongRuns: 0,
    ms: Math.round(now() - started), runner, cancelled: false, seed, ...extra,
  });
  const cancelledResult = () => ({ meta: metaOf({ cancelled: true }), rows: [], notices: [] });

  if (hooks.progress) hooks.progress('prepare', 0);
  const p = prepare(input);
  const scan = await scanCells(p, cfg, hooks);
  if (scan.cancelled) return cancelledResult();

  // FDR on the kept cells (decision D4, bhOnKept in fdr.js): exact wherever q is below pKeep, null otherwise.
  const kept = scan.kept.sort((a, b) => a.p - b.p || a.e - b.e || a.o - b.o || a.wi - b.wi);
  const qs = bhOnKept(kept.map((c) => c.p), scan.tested, cfg.pKeep);
  const byKey = new Map();
  kept.forEach((c, i) => {
    c.q = qs[i];
    c.rates = rateStats(c.k, c.n, c.K, c.N);
    c.longRuns = p.lagOne[c.e] >= cfg.autocorr.threshold || p.lagOne[c.o] >= cfg.autocorr.threshold;
    c.placeboP = null;
    c.placeboPercentile = null;
    c.timeSplitFail = null;
    c.lowCompSensitive = null;
    byKey.set(keyOf(c.e, c.o, c.wi), c);
  });

  // Top-K stages (decision D5 and D6/D7) for the cells with the smallest p.
  const masksCache = new Map();
  const masksFor = (c) => {
    const id = `${c.o}:${c.wi}`;
    if (!masksCache.has(id)) masksCache.set(id, outcomeMasks(p, c.o, cfg.windows[c.wi].days, cfg.minWindowCoverage));
    return masksCache.get(id);
  };
  const topCount = Math.min(kept.length, cfg.placebo.topK);
  for (let i = 0; i < topCount; i += 1) {
    const c = kept[i];
    const masks = masksFor(c);
    const rr = c.rates.rr;
    Object.assign(c, placeboForCell(p, c.e, masks, rr, cfg.placebo.shuffles[mode], rnd, cfg.placebo.minShiftDays));
    c.timeSplitFail = timeSplitFails(p, c.e, masks, rr, cfg);
    c.lowCompSensitive = lowCompletenessFlag(p, c.e, masks, rr, cfg);
    if (await gate.tick()) return cancelledResult();
  }

  const flagsOf = (c) => ({
    lowSample: lowSampleFlag(c.n, cfg),
    failsFdr: failsFdrFlag(c.q, cfg),
    failsTimeSplit: c.timeSplitFail,
    lowCompletenessSensitive: c.lowCompSensitive,
    highAutocorrelation: highAutocorrelationFlag(c.placeboP, cfg),
    newLabel: newLabelFlag(p, c.e, c.o, cfg),
    shortWindow: shortWindowFlag(cfg.windows[c.wi].days, cfg),
    directionAmbiguity: directionAmbiguityFlag(c, byKey.get(keyOf(c.o, c.e, c.wi)), cfg),
  });

  const ranked = [...kept].sort(rankCmp).slice(0, cfg.keepTop);
  const rows = ranked.map((c) => ({
    exposure: c.e,
    outcome: c.o,
    window: cfg.windows[c.wi].id,
    n: c.n,
    k: c.k,
    K: c.K,
    N: c.N,
    rate: c.rates.rate,
    base: c.rates.base,
    rr: c.rates.rr,
    diff: c.rates.diff,
    p: c.p,
    q: c.q,
    placeboP: c.placeboP,
    placeboPercentile: c.placeboPercentile,
    longRuns: c.longRuns,
    flags: flagsOf(c),
  }));

  const notices = flagDefs.map((f) => f.id).filter((id) => (
    rows.length > 0 && rows.filter((r) => r.flags[id] === true).length > cfg.noticeShare * rows.length
  ));
  const found = kept.filter((c) => c.q !== null && c.q < cfg.alpha);
  const discoveries = found.length;
  const discoveriesLongRuns = found.filter((c) => c.longRuns).length;
  const meta = metaOf({
    cellsTested: scan.tested, cellsUntested: scan.untested, kept: kept.length, discoveries, discoveriesLongRuns,
  });
  return { meta, rows, notices };
}
