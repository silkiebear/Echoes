// Pure data builders for the time views (T1 to T4). Input is the generated synthetic data (core/synth.js).
// Shapes are documented here; the views only draw them. Nothing here is a statistic.
import { viewSettings } from '../config/views.js';
import { columnOf } from './calendar.js';

const T = viewSettings.time;

export function labelIdOf(synth, text) {
  const label = synth.labels.find((l) => l.text === text);
  if (!label) throw new Error('time-demo: a configured synthetic label is missing');
  return label.id;
}

// Short month name for month 0 (January) to 11.
export function monthShort(month) {
  return new Date(Date.UTC(2024, month, 1)).toLocaleDateString(undefined, { month: 'short', timeZone: 'UTC' });
}

// "Jan 2025" style label for an ISO date (YYYY-MM-DD).
export function monthYear(iso) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, { year: 'numeric', month: 'short', timeZone: 'UTC' });
}

// Shape: { year, firstRow, days: [{ index, row, month, dom, mood, present }] } for one calendar year.
// row 0 to 6 is the position in the week (time.weekStart); the weekday comes from the date, never from a stored field.
// month 0 to 11; dom 1 to 31; present 1 when the label is on that day, else 0.
export function buildYearData(synth, year, labelId) {
  const yearDays = synth.days.filter((d) => d.date.startsWith(`${year}-`));
  return {
    year,
    firstRow: columnOf(yearDays[0].date, T.weekStart),
    days: yearDays.map((d, index) => ({
      index,
      row: columnOf(d.date, T.weekStart),
      month: Number(d.date.slice(5, 7)) - 1,
      dom: Number(d.date.slice(8, 10)),
      mood: d.mood,
      present: d.labels.includes(labelId) ? 1 : 0,
    })),
  };
}

export function lastYear(synth) {
  return Number(synth.days[synth.days.length - 1].date.slice(0, 4));
}

// Shape: { span, dates, rows: [{ id, text, present: 0|1 per day }], mood: score per day }.
// Full span, oldest first; dates[i] is the ISO date of day i. The view cuts the range it shows.
export function buildLanesData(synth, labelIds) {
  const rows = labelIds.map((id) => ({ id, text: synth.labels[id].text, present: [] }));
  const mood = [];
  for (const day of synth.days) {
    rows.forEach((row) => row.present.push(day.labels.includes(row.id) ? 1 : 0));
    mood.push(day.mood);
  }
  return {
    span: synth.days.length,
    dates: synth.days.map((day) => day.date),
    rows,
    mood,
  };
}

// Shape: { bins: [{ key: 'YYYY-MM', days, counts: count per label }], labels: [{ id, text }] }.
// The last `binCount` calendar months of the data, oldest first.
export function buildStripData(synth, labelIds, binCount) {
  const months = new Map();
  for (const day of synth.days) {
    const key = day.date.slice(0, 7);
    let bin = months.get(key);
    if (!bin) {
      bin = { key, days: 0, counts: labelIds.map(() => 0) };
      months.set(key, bin);
    }
    bin.days += 1;
    labelIds.forEach((id, i) => {
      if (day.labels.includes(id)) bin.counts[i] += 1;
    });
  }
  return {
    bins: [...months.values()].slice(-binCount),
    labels: labelIds.map((id) => ({ id, text: synth.labels[id].text })),
  };
}

// Shape: { window, startDate, endDate, series: [{ id, text, values }] }. values[i] is the share of the
// `window` days ending on day (window - 1 + i) that have the label; the first full window starts the series.
export function buildRollingData(synth, labelIds, windowDays) {
  const n = synth.days.length;
  const w = Math.min(windowDays, n);
  const series = labelIds.map((id) => {
    const prefix = new Int32Array(n + 1);
    for (let i = 0; i < n; i++) prefix[i + 1] = prefix[i] + (synth.days[i].labels.includes(id) ? 1 : 0);
    const values = [];
    for (let t = w - 1; t < n; t++) values.push((prefix[t + 1] - prefix[t + 1 - w]) / w);
    return { id, text: synth.labels[id].text, values };
  });
  return {
    window: w,
    startDate: synth.days[w - 1].date,
    endDate: synth.days[n - 1].date,
    series,
  };
}

// Default data for every time view (used by the gallery, the layout test and the view tests).
export function buildTimeData(synth) {
  const year = lastYear(synth);
  const lanes = buildLanesData(synth, T.lanes.labels.map((text) => labelIdOf(synth, text)));
  return {
    T1: buildYearData(synth, year, labelIdOf(synth, T.defaultYearLabel)),
    T2: lanes,
    T3: buildStripData(synth, T.strip.labels.map((text) => labelIdOf(synth, text)), T.strip.bins),
    T4: buildRollingData(synth, T.rolling.labels.map((text) => labelIdOf(synth, text)), T.rolling.defaultWindow),
  };
}
