// Demo helper for the gallery. Not the statistics engine; replaced in Phase 3.
// No placebo tests, no FDR.
import { demo } from '../config/flags.js';

// Echo = mean over exposure days d (with d+span inside the data) of the fraction of days d+1..d+span
// that contain the outcome. Baseline = overall outcome day rate. Prefix sums keep each window O(exposures).
export function computeEchoes(synth, windows, cfg) {
  const n = synth.days.length;
  const ids = synth.labels.map((label) => label.id);
  const present = ids.map(() => new Uint8Array(n));
  for (const day of synth.days) for (const id of day.labels) present[id][day.day] = 1;
  const prefix = present.map((arr) => {
    const sums = new Int32Array(n + 1);
    for (let i = 0; i < n; i++) sums[i + 1] = sums[i] + arr[i];
    return sums;
  });
  const baseline = prefix.map((sums) => sums[n] / n);
  const exposureDays = present.map((arr) => {
    const days = [];
    for (let i = 0; i < n; i++) if (arr[i]) days.push(i);
    return days;
  });
  const table = [];
  for (const e of ids) {
    for (const o of ids) {
      if (o === e) continue;
      windows.forEach((win, w) => {
        const span = win.days;
        const sums = prefix[o];
        let count = 0;
        let total = 0;
        for (const d of exposureDays[e]) {
          if (d + span > n - 1) break; // exposure days ascend, so the rest also lack a full window
          total += (sums[d + span + 1] - sums[d + 1]) / span;
          count += 1;
        }
        table.push(echoRecord(e, o, w, count, total, baseline[o], cfg));
      });
    }
  }
  return { exposures: ids, outcomes: ids, baseline, table };
}

function echoRecord(exposure, outcome, window, nExposed, total, base, cfg) {
  const enough = nExposed > 0 && nExposed >= cfg.minExposedDays;
  const rate = enough ? total / nExposed : null;
  const rr = enough && base > 0 ? rate / base : null;
  const diff = enough ? rate - base : null;
  return { exposure, outcome, window, nExposed, rate, baseline: base, rr, diff };
}

// Natural demo flags only (thresholds from config/flags.js). Null results carry no flags.
export function demoFlags(cell, windowDays) {
  if (cell.rr === null || cell.rr === undefined) return [];
  const out = [];
  if (cell.nExposed < demo.lowSampleBelow) out.push('lowSample');
  if (windowDays <= demo.shortWindowDaysAtMost) out.push('shortWindow');
  return out;
}

// Forced demo flags cycle through demo.forced every `every` items, so each badge style appears in the gallery.
function forcedFlag(index, every) {
  if (index % every !== 0) return null;
  return demo.forced[(index / every) % demo.forced.length];
}

function withForced(natural, forced) {
  return [...new Set([...natural, ...forced])];
}

// Shape: { outcomes: [{id, label}], windows: [{id, label}], cells: cells[o][w] } where a cell is
// { rr, diff, nExposed, flags, forced } or { rr: null }. `forced` lists the DEMO-only flags in `flags`.
export function buildE1Data(synth, echoes, exposureId, outcomeIds, windows) {
  const byKey = new Map();
  for (const rec of echoes.table) {
    if (rec.exposure === exposureId) byKey.set(`${rec.outcome}:${rec.window}`, rec);
  }
  let computed = 0;
  const cells = outcomeIds.map((o) => windows.map((win, w) => {
    const rec = byKey.get(`${o}:${w}`);
    if (!rec || rec.rr === null) return { rr: null };
    const forced = forcedFlag(computed, demo.forcedEveryCell);
    computed += 1;
    const forcedList = forced ? [forced] : [];
    return {
      rr: rec.rr,
      diff: rec.diff,
      nExposed: rec.nExposed,
      flags: withForced(demoFlags(rec, win.days), forcedList),
      forced: forcedList,
    };
  }));
  return {
    outcomes: outcomeIds.map((id) => ({ id, label: synth.labels[id].text })),
    windows: windows.map((win) => ({ id: win.id, label: win.label })),
    cells,
  };
}

// Shape: { eventLabel, outcomeLabel, baseline, points: [{ day, rate, lo, hi, n }] }. rate is null when n is 0.
// The band is demo only: baseline times (1 - f) to (1 + f). It is not a placebo band.
export function buildE2Data(synth, exposureId, outcomeId, cfg) {
  const n = synth.days.length;
  const exposed = new Uint8Array(n);
  const outcome = new Uint8Array(n);
  let outcomeDays = 0;
  for (const day of synth.days) {
    if (day.labels.includes(exposureId)) exposed[day.day] = 1;
    if (day.labels.includes(outcomeId)) {
      outcome[day.day] = 1;
      outcomeDays += 1;
    }
  }
  const baseline = outcomeDays / n;
  const points = [];
  for (let d = 1; d <= cfg.days; d++) {
    let hits = 0;
    let count = 0;
    for (let t = 0; t + d < n; t++) {
      if (!exposed[t]) continue;
      count += 1;
      hits += outcome[t + d];
    }
    points.push({
      day: d,
      rate: count > 0 ? hits / count : null,
      lo: baseline * (1 - cfg.bandFraction),
      hi: baseline * (1 + cfg.bandFraction),
      n: count,
    });
  }
  return {
    eventLabel: synth.labels[exposureId].text,
    outcomeLabel: synth.labels[outcomeId].text,
    baseline,
    points,
  };
}

// Shape: { rows: [{ rank, exposureLabel, outcomeLabel, windowLabel, rr, diff, nExposed, flags, forced }] }.
// Top `maxRows` non-null results by rate ratio.
export function buildE3Data(synth, echoes, windows, maxRows) {
  const ranked = echoes.table
    .filter((rec) => rec.rr !== null)
    .sort((a, b) => b.rr - a.rr)
    .slice(0, maxRows);
  const rows = ranked.map((rec, i) => {
    const forced = forcedFlag(i, demo.forcedEveryRow);
    const forcedList = forced ? [forced] : [];
    return {
      rank: i + 1,
      exposureLabel: synth.labels[rec.exposure].text,
      outcomeLabel: synth.labels[rec.outcome].text,
      windowLabel: windows[rec.window].label,
      rr: rec.rr,
      diff: rec.diff,
      nExposed: rec.nExposed,
      flags: withForced(demoFlags(rec, windows[rec.window].days), forcedList),
      forced: forcedList,
    };
  });
  return { rows };
}
