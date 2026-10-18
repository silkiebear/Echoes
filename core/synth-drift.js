// Synthetic drift null: filler labels that are null by construction but non-stationary (phase 4b, tier 4b.1).
// Each label is present only inside its own active period, so a constant-rate test can see spurious associations.
// Streak labels are two-state chains (autocorrelated); trend labels have a linear rate drift. No label affects another.
// Deterministic for a given (cfg, seed). Each filler has its own PRNG stream (seed + STREAM_SPACING * index, the same
// convention as synth-wide.js), so adding fillers does not change earlier labels.
// Output: { labels, moodNames, entries, days, meta }, the same shape as generateWide; meta = { active, kind }.

import { addDays, weekdayOf } from './calendar.js';
import { mulberry32 } from './synth.js';

const STREAM_SPACING = 1000;

function streamRnd(seed, index) {
  return mulberry32(seed + STREAM_SPACING * index);
}

// Log-uniform rate in [lo, hi], drawn once per label.
function logUniform(rnd, lo, hi) {
  const u = rnd();
  return Math.exp(Math.log(lo) + u * (Math.log(hi) - Math.log(lo)));
}

function clamp(value, lo, hi) {
  return Math.min(hi, Math.max(lo, value));
}

// Streak labels are chosen by index so that the first floor(share * count) labels are streaks for any count, and a
// label's kind never depends on how many fillers are generated (adding fillers keeps earlier labels unchanged).
function isStreak(index, share) {
  return Math.floor((index + 1) * share) > Math.floor(index * share);
}

// Active period [first, last] (inclusive): first is uniform below startMaxFraction, the length is at least
// activeMinFraction and ends no later than the last day.
function activePeriod(rnd, days, cfg) {
  const minLen = Math.ceil(cfg.activeMinFraction * days);
  const first = Math.floor(rnd() * cfg.startMaxFraction * days);
  const len = minLen + Math.floor(rnd() * (days - first - minLen + 1));
  return { first, last: first + len - 1 };
}

// Two-state chain over the active period, starting absent. pStart makes the stationary rate equal to base:
// base = pStart / (pStart + 1 - pStay).
function streakSeries(rnd, span, base, pStay) {
  const pStart = base * (1 - pStay) / (1 - base);
  const series = new Uint8Array(span);
  let prev = 0;
  for (let t = 0; t < span; t += 1) {
    prev = rnd() < (prev === 1 ? pStay : pStart) ? 1 : 0;
    series[t] = prev;
  }
  return series;
}

export function generateDrift(cfg, seed, fillerCount = cfg.fillerCount) {
  const { days, startDate } = cfg;
  if (cfg.startMaxFraction + cfg.activeMinFraction > 1) {
    throw new RangeError('cfg: startMaxFraction plus activeMinFraction exceeds 1');
  }

  const labels = [];
  const dayIds = Array.from({ length: days }, () => []);
  const active = [];
  const kind = [];
  for (let i = 0; i < fillerCount; i += 1) {
    labels.push({ id: i, text: `Drift ${String(i + 1).padStart(3, '0')}` });
    const rnd = streamRnd(seed, i);
    const period = activePeriod(rnd, days, cfg);
    const span = period.last - period.first + 1;
    const base = logUniform(rnd, cfg.baseRate.min, cfg.baseRate.max);
    active.push(period);
    if (isStreak(i, cfg.streakShare)) {
      kind.push('streak');
      const series = streakSeries(rnd, span, base, cfg.pStay);
      for (let t = 0; t < span; t += 1) {
        if (series[t]) dayIds[period.first + t].push(i);
      }
    } else {
      kind.push('trend');
      const trend = cfg.trend.min + rnd() * (cfg.trend.max - cfg.trend.min);
      for (let t = 0; t < span; t += 1) {
        const rate = clamp(base * (1 + trend * t / span), cfg.minRate, cfg.maxRate);
        if (rnd() < rate) dayIds[period.first + t].push(i);
      }
    }
  }

  const daysOut = [];
  const entriesOut = [];
  for (let t = 0; t < days; t += 1) {
    const iso = addDays(startDate, t);
    const weekday = weekdayOf(iso);
    const ids = dayIds[t];
    daysOut.push({ day: t, date: iso, weekday, labels: ids, entryCount: 1, moods: [] });
    entriesOut.push({ date: iso, minutes: null, day: t, labels: ids.slice(), moods: [] });
  }

  return { labels, moodNames: [], entries: entriesOut, days: daysOut, meta: { active, kind } };
}
