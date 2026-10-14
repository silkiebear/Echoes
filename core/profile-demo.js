// P3/P4 profile helpers: share of days carrying a label, split by weekday or month.
// Uses only the assigned day date (UTC), never a calendar date derived from entries.

import { columnOf, weekdayLabels } from './calendar.js';
const MONTHS = 12;

function labelText(synth, labelId) {
  return synth.labels.find((l) => l.id === labelId).text;
}

function baseline(synth, withLabel) {
  const total = synth.days.length;
  const withLabelTotal = withLabel.reduce((s, v) => s + v, 0);
  return total ? withLabelTotal / total : 0;
}

export function buildWeekdayProfile(synth, labelId, weekStart) {
  const labels = weekdayLabels(weekStart);
  const observed = new Array(labels.length).fill(0);
  const withLabel = new Array(labels.length).fill(0);
  for (const d of synth.days) {
    const col = columnOf(d.date, weekStart);
    observed[col] += 1;
    if (d.labels.includes(labelId)) withLabel[col] += 1;
  }
  const rows = [];
  for (let c = 0; c < labels.length; c += 1) {
    rows.push({
      label: labels[c],
      rate: observed[c] > 0 ? withLabel[c] / observed[c] : 0,
      n: observed[c],
    });
  }
  return { title: labelText(synth, labelId), rows, baseline: baseline(synth, withLabel) };
}

export function buildMonthProfile(synth, labelId) {
  const observed = new Array(MONTHS).fill(0);
  const withLabel = new Array(MONTHS).fill(0);
  for (const d of synth.days) {
    const m = Number(d.date.slice(5, 7)) - 1;
    observed[m] += 1;
    if (d.labels.includes(labelId)) withLabel[m] += 1;
  }
  const rows = [];
  for (let m = 0; m < MONTHS; m += 1) {
    rows.push({
      month: m,
      rate: observed[m] > 0 ? withLabel[m] / observed[m] : 0,
      n: observed[m],
    });
  }
  return { title: labelText(synth, labelId), rows, baseline: baseline(synth, withLabel) };
}
