// Adapters from the Echo scan result and the loaded export to the E views (phase 4d, 4d.4). Pure: no DOM, no store, no
// logging. Label ids and texts stay in the data; the views get the same shapes as the synthetic demos (echo-demo.js,
// event-study-demo.js). Descriptive only: the scan's q is not in any of these shapes.
import { buildE4Data } from './event-study-demo.js';
import { placeboBand } from './stats/placebo-run.js';
import { mulberry32 } from './synth.js';

// The flags of a scan row as a list of the ids that are true, plus longRuns (an engine flag outside the flags object).
function rowFlags(row) {
  const ids = Object.keys(row.flags).filter((id) => row.flags[id] === true);
  if (row.longRuns) ids.push('longRuns');
  return ids;
}

// E1 (view shape: outcomes, windows, cells[o][w]). A cell with no row was not kept by the scan (null style).
export function buildE1Real(scanResult, labels, windows, exposureId, outcomeIds) {
  const byKey = new Map();
  for (const row of scanResult.rows) {
    if (row.exposure === exposureId) byKey.set(`${row.outcome}:${row.window}`, row);
  }
  const cells = outcomeIds.map((o) => windows.map((win) => {
    const row = byKey.get(`${o}:${win.id}`);
    if (!row || !Number.isFinite(row.rrAdj)) return { rr: null };
    return { rr: row.rrAdj, diff: row.diff, nExposed: row.n, flags: rowFlags(row), forced: [] };
  }));
  return {
    outcomes: outcomeIds.map((id) => ({ id, label: labels[id].text })),
    windows: windows.map((win) => ({ id: win.id, label: win.label })),
    cells,
  };
}

// E2 (view shape: eventLabel, outcomeLabel, baseline, points[{ day, rate, lo, hi, n }]). The points are the lag rates of
// the exposure on observed days (placeboBand, lag 1 to cfg.days) with the band from shuffled exposures. The baseline is
// the share of observed days with the outcome. A lag with no band (no shuffle had an exposed day) uses the baseline.
export function buildE2Real(prepared, exposureId, outcomeId, cfg) {
  const band = placeboBand(prepared, exposureId, outcomeId, cfg.days, cfg.shuffles, mulberry32(cfg.seed), cfg.statsCfg);
  let observed = 0;
  let outcomeDays = 0;
  for (let t = 0; t < prepared.n; t += 1) {
    if (!prepared.observed[t]) continue;
    observed += 1;
    if (prepared.prefix[outcomeId][t + 1] - prepared.prefix[outcomeId][t] > 0) outcomeDays += 1;
  }
  const baseline = observed > 0 ? outcomeDays / observed : 0;
  return {
    eventLabel: cfg.labels[exposureId].text,
    outcomeLabel: cfg.labels[outcomeId].text,
    baseline,
    points: band.map((b) => ({
      day: b.lag,
      rate: b.rate,
      lo: b.lo ?? baseline,
      hi: b.hi ?? baseline,
      n: b.n,
    })),
  };
}

// E4 (view shape of event-study-demo.js). The view data is the observed days only (as in phase 4c.3), so the window
// counts observed days, not calendar days.
export function buildE4Real(viewData, exposureId, windowDays) {
  const synth = {
    labels: viewData.labels,
    days: viewData.observedDays.map((d, t) => ({ day: t, labels: d.labels })),
  };
  return buildE4Data(synth, exposureId, windowDays);
}
