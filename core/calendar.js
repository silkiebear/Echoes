// UTC only, because local time shifts on daylight saving days and would move dates.
// All arithmetic uses UTC; no local-time getters or local Date constructors.

const WEEK_DAYS = 7;
const MS_PER_DAY = 86400000;
const MINUTES_PER_DAY = 1440;

export function addDays(iso, n) {
  const ms = Date.parse(iso + 'T00:00:00Z');
  const out = new Date(Date.UTC(
    new Date(ms).getUTCFullYear(),
    new Date(ms).getUTCMonth(),
    new Date(ms).getUTCDate() + n
  ));
  const y = String(out.getUTCFullYear()).padStart(4, '0');
  const m = String(out.getUTCMonth() + 1).padStart(2, '0');
  const d = String(out.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function weekdayOf(iso) {
  return new Date(Date.parse(iso + 'T00:00:00Z')).getUTCDay();
}

export function columnOf(iso, weekStart) {
  return (weekdayOf(iso) - weekStart + WEEK_DAYS) % WEEK_DAYS;
}

export function weekStartOf(iso, weekStart) {
  return addDays(iso, -columnOf(iso, weekStart));
}

export function dayOf(iso, minutes, boundaryMinutes) {
  if (minutes < boundaryMinutes) {
    return addDays(iso, -1);
  }
  return iso;
}

export function weekdayLabels(weekStart) {
  const labels = [];
  for (let c = 0; c < WEEK_DAYS; c += 1) {
    const index = (weekStart + c) % WEEK_DAYS;
    const day = new Date(Date.UTC(2024, 0, 7 + index));
    labels.push(day.toLocaleDateString(undefined, {
      weekday: 'short',
      timeZone: 'UTC'
    }));
  }
  return labels;
}
