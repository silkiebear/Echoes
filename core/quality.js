// Coverage of the loaded data (Q1): range, days and entries, tracker days, low-completeness days, the by-year
// split and time-of-day diversity. Pure: nothing is written and no DOM is touched.
import { timeDiversity } from './time-diversity.js';

const YEAR_LENGTH = 4;

function median(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// cfg: { completeness: { minMarksFraction }, diversity: { topShareMax, minDistinctHours } }
export function buildQuality(data, settings, cfg) {
  const days = data.days;
  const withEntries = days.filter((d) => d.entryCount > 0);
  const medianMarks = median(withEntries.map((d) => d.labels.length));
  const threshold = cfg.completeness.minMarksFraction * medianMarks;
  const lowCompletenessDays = withEntries.filter((d) => d.labels.length < threshold).length;

  const tracker = settings.observation.trackerLabel.trim();
  let trackerDays = null;
  if (tracker !== '') {
    const label = data.labels.find((l) => l.text === tracker);
    trackerDays = label ? days.filter((d) => d.labels.includes(label.id)).length : 0;
  }

  const years = new Map();
  const yearRow = (date) => {
    const year = date.slice(0, YEAR_LENGTH);
    if (!years.has(year)) years.set(year, { year, days: 0, daysWithEntries: 0, entries: 0 });
    return years.get(year);
  };
  for (const d of days) {
    const row = yearRow(d.date);
    row.days += 1;
    if (d.entryCount > 0) row.daysWithEntries += 1;
  }
  for (const e of data.entries) yearRow(days[e.day].date).entries += 1;
  const byYear = [...years.values()].sort((a, b) => (a.year < b.year ? -1 : 1));

  const timed = data.entries.filter((e) => e.minutes !== null);
  return {
    range: days.length ? { from: days[0].date, to: days[days.length - 1].date } : null,
    spanDays: days.length,
    daysWithEntries: withEntries.length,
    entries: data.entries.length,
    entriesNoTime: data.entries.length - timed.length,
    trackerDays,
    medianMarks,
    lowCompletenessDays,
    lowCompletenessShare: withEntries.length ? lowCompletenessDays / withEntries.length : 0,
    byYear,
    timeDiversity: timeDiversity(timed, cfg.diversity),
  };
}
