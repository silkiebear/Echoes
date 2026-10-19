// Adapter from parsed export data to the shapes the time and period builders read (phase 4c, 4c.2 and 4c.3). Pure: no
// DOM, no logging. Output:
//   labels:        [{ id, text }]
//   days:          every calendar day from the first to the last entry, contiguous: { date, weekday, labels, mood,
//                  entryCount }. Used by the calendar views (T1 year grid, T2 lanes), where a day with no entry is a
//                  gap (mood null, no label).
//   observedDays:  the days with at least one entry (SPEC 10: unobserved days are skipped, never zeros). Used for every
//                  share and rate (T3, T4, P3, P4).
//   entries:       the entries with a clock time: { date, minutes, labels } (used by P1 and P2). Entries without a time
//                  are not in the time-of-day views; their number is untimedCount.
// Weekday comes from the assigned date (calendar.weekdayOf), never from the export. A day's mood is the mean of its
// entries' scores (each entry's score is the mean of its mood scores, core/mood.js moodScore), rounded to the nearest
// whole score; a day with no scored mood is null (drawn as its own class by the views, see diverge.js moodBin).
import { weekdayOf } from './calendar.js';
import { moodScore } from './mood.js';
import { explore } from '../config/explore.js';

const HEX = /^#[0-9a-fA-F]{6}$/;

function meanOf(values) {
  return values.reduce((s, v) => s + v, 0) / values.length;
}

export function isHexColour(value) {
  return typeof value === 'string' && HEX.test(value);
}

// The settings' moods as a scale for the views (4d.0.2, 4e.0.1): one entry per mood, best first (highest score first,
// so the key reads yay! to awful on the default presets). score = n - order + 1 (SPEC 12). Names and colours are
// copied; a colour that is not #rrggbb gets the fallback.
export function moodScale(settings) {
  const moods = Array.isArray(settings?.moods) ? settings.moods : [];
  const n = moods.length;
  return moods
    .map((m) => ({
      score: n - m.order + 1,
      name: String(m.name),
      color: isHexColour(m.color) ? m.color : explore.mood.fallbackColor,
    }))
    .sort((a, b) => b.score - a.score);
}

function dayMoods(data, settings) {
  const sums = data.days.map(() => ({ total: 0, n: 0 }));
  for (const entry of data.entries) {
    const scores = entry.moods
      .map((id) => moodScore(settings, data.moodNames[id]))
      .filter((score) => score !== null);
    if (scores.length === 0) continue;
    const bucket = sums[entry.day];
    bucket.total += meanOf(scores);
    bucket.n += 1;
  }
  return sums.map((b) => (b.n === 0 ? null : Math.round(b.total / b.n)));
}

export function toViewData(data, settings, cfg) {
  if (!data || !Array.isArray(data.days) || !Array.isArray(data.entries)) {
    throw new TypeError('toViewData: argument data is not parsed export data');
  }
  if (!settings || !Array.isArray(settings.moods)) {
    throw new TypeError('toViewData: argument settings has no moods');
  }
  if (!cfg || cfg.dayMood?.rounding !== 'nearest') {
    throw new TypeError('toViewData: argument cfg.dayMood.rounding must be nearest');
  }
  const moods = dayMoods(data, settings);
  const days = data.days.map((day, t) => ({
    date: day.date,
    weekday: weekdayOf(day.date),
    labels: day.labels.slice(),
    mood: moods[t],
    entryCount: day.entryCount,
  }));
  const timed = data.entries.filter((e) => e.minutes !== null);
  return {
    labels: data.labels.map((l) => ({ id: l.id, text: l.text })),
    days,
    observedDays: days.filter((d) => d.entryCount > 0),
    entries: timed.map((e) => ({ date: e.date, minutes: e.minutes, labels: e.labels.slice() })),
    untimedCount: data.entries.length - timed.length,
  };
}
