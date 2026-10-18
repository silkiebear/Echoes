// Planted pair for the power measurement (phase 4d, 4d.1.4; report only). plantPair adds two labels, 'Power X' and
// 'Power Y', to a generated dataset (generateDrift output: one entry per day). X is present on each day with probability
// cfg.pExposure, independently. Y is present on a day with probability cfg.pGiven when X was present cfg.lag days earlier,
// and with cfg.pBase otherwise. Only ADDS labels: every existing label and every existing day and entry stays as it was.
// Deterministic for a given (data, cfg, seed): X and Y each have their own PRNG stream, and Y draws once per day.
import { mulberry32 } from './synth.js';

const X_STREAM = 611;
const Y_STREAM = 613;
const EXPOSURE_TEXT = 'Power X';
const OUTCOME_TEXT = 'Power Y';

export function plantPair(data, cfg, seed) {
  const days = data.days.length;
  const xRnd = mulberry32(seed + X_STREAM);
  const yRnd = mulberry32(seed + Y_STREAM);
  const xId = data.labels.length;
  const yId = xId + 1;
  const xOn = Array.from({ length: days }, () => xRnd() < cfg.pExposure);
  const yOn = xOn.map((_, t) => {
    const exposed = t >= cfg.lag && xOn[t - cfg.lag];
    return yRnd() < (exposed ? cfg.pGiven : cfg.pBase);
  });
  const extra = (t) => [...(xOn[t] ? [xId] : []), ...(yOn[t] ? [yId] : [])];
  return {
    ...data,
    labels: [...data.labels, { id: xId, text: EXPOSURE_TEXT }, { id: yId, text: OUTCOME_TEXT }],
    days: data.days.map((day, t) => ({ ...day, labels: [...day.labels, ...extra(t)] })),
    entries: data.entries.map((entry) => ({ ...entry, labels: [...entry.labels, ...extra(entry.day)] })),
  };
}

export const powerLabelIds = (data) => ({ exposure: data.labels.length - 2, outcome: data.labels.length - 1 });
