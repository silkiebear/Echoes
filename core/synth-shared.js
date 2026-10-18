// Shared day-level logging intensity (H3) and a weekly cycle (H4) on top of the drift null (phase 4c, tier 4c.1; report
// only). generateShared starts from generateDrift and only REMOVES label presences, so a label is never added and stays
// absent outside its own active period. No label affects another label; what changes is the day-to-day pattern that a
// constant-rate test has to cope with. Deterministic for a given (sharedCfg, driftCfg, seed, mode, fillerCount).
import { weekdayOf } from './calendar.js';
import { mulberry32 } from './synth.js';
import { generateDrift } from './synth-drift.js';

const MODES = ['shared', 'weekly', 'both'];
// Stream offsets are not multiples of the label spacing (1000), so they never equal a label's own stream seed.
const LEVEL_STREAM = 500009;
const WEEKLY_STREAM = 500017;
const KEEP_STREAM = 500031;
const STREAM_SPACING = 1000;
const WEEK_DAYS = 7;

// Keep probability for a label on a weekday: 1 with no amplitude, and (1 - amp) / (1 + amp) at the trough.
export function weeklyKeep(amp, phase, weekday) {
  return (1 + amp * Math.cos(2 * Math.PI * (weekday - phase) / WEEK_DAYS)) / (1 + amp);
}

// Two-state chain over the days, starting high. A day's level is the level of its state.
function levelSeries(rnd, days, cfg) {
  const levels = [];
  let high = true;
  for (let t = 0; t < days; t += 1) {
    if (t > 0 && rnd() >= cfg.pStay) high = !high;
    levels.push(high ? cfg.levels.high : cfg.levels.low);
  }
  return levels;
}

// Only the first floor(share x count) labels have a weekly cycle; each draws its amplitude, then its phase.
function weeklyParams(count, cfg, seed) {
  const cut = Math.floor(cfg.weekly.share * count);
  return Array.from({ length: count }, (_, i) => {
    if (i >= cut) return null;
    const rnd = mulberry32(seed + WEEKLY_STREAM + STREAM_SPACING * i);
    const amp = rnd() * cfg.weekly.ampMax;
    const phase = rnd() * WEEK_DAYS;
    return { amp, phase };
  });
}

export function generateShared(sharedCfg, driftCfg, seed, mode, fillerCount = driftCfg.fillerCount) {
  if (!MODES.includes(mode)) throw new RangeError(`generateShared: mode must be one of ${MODES.join(', ')}`);
  const base = generateDrift(driftCfg, seed, fillerCount);
  const useShared = mode === 'shared' || mode === 'both';
  const useWeekly = mode === 'weekly' || mode === 'both';
  const levels = useShared ? levelSeries(mulberry32(seed + LEVEL_STREAM), base.days.length, sharedCfg) : null;
  const weekly = useWeekly ? weeklyParams(base.labels.length, sharedCfg, seed) : null;
  const keep = mulberry32(seed + KEEP_STREAM);
  const days = base.days.map((day, t) => {
    const weekday = weekdayOf(day.date);
    const ids = day.labels.filter((id) => {
      if (useWeekly && weekly[id] !== null && keep() >= weeklyKeep(weekly[id].amp, weekly[id].phase, weekday)) return false;
      if (useShared && keep() >= levels[t]) return false;
      return true;
    });
    return { ...day, labels: ids };
  });
  const entries = base.entries.map((entry, t) => ({ ...entry, labels: days[t].labels.slice() }));
  return {
    labels: base.labels,
    moodNames: base.moodNames,
    entries,
    days,
    meta: { active: base.meta.active, kind: base.meta.kind, levels, weekly },
  };
}
