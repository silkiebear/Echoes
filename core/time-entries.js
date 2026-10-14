// Entries merge labels logged in the same time slot into one entry.
// Day minutes after midnight belong to the assigned day (day.date).
import { addDays } from './calendar.js';

const TWO_PI = 2 * Math.PI;
const MIN_U = 1e-12;
const MINUTES_PER_DAY = 1440;

function gaussian(rnd) {
  const u1 = Math.max(rnd(), MIN_U);
  const u2 = rnd();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(TWO_PI * u2);
}

export function buildEntries(days, labels, cfg, rnd) {
  const result = [];

  for (const day of days) {
    if (day.labels.length === 0) continue;

    if (cfg.mode === 'single') {
      result.push({
        date: day.date,
        minutes: cfg.singleMinutes,
        day: day.date,
        labels: day.labels.slice(),
      });
      continue;
    }

    const pairs = day.labels.map((id) => {
      const text = labels.find((l) => l.id === id).text;
      const profile = cfg.profiles[text];
      let value;
      if (profile) {
        const z = gaussian(rnd);
        value = Math.round(profile.center + profile.sd * z);
      } else {
        value = Math.round(cfg.defaultUniform.from + (cfg.defaultUniform.to - cfg.defaultUniform.from) * rnd());
      }
      const lo = cfg.dayStartMinutes;
      const hi = cfg.dayStartMinutes + MINUTES_PER_DAY - 1;
      value = Math.min(hi, Math.max(lo, value));
      return { id, value };
    });

    pairs.sort((a, b) => a.value - b.value);

    const slots = [];
    for (const pair of pairs) {
      const slot = Math.floor(pair.value / cfg.entryGranularityMinutes);
      const last = slots[slots.length - 1];
      if (last && last.slot === slot) {
        last.labels.push(pair.id);
      } else {
        slots.push({ slot, value: pair.value, labels: [pair.id] });
      }
    }

    for (const entry of slots) {
      const over = entry.value >= MINUTES_PER_DAY;
      result.push({
        date: over ? addDays(day.date, 1) : day.date,
        minutes: over ? entry.value - MINUTES_PER_DAY : entry.value,
        day: day.date,
        labels: entry.labels,
      });
    }
  }

  return result;
}
