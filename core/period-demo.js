import { columnOf, weekdayLabels } from './calendar.js';
import { timeDiversity } from './time-diversity.js';
import { timeDiversity as diversityCfg } from '../config/flags.js';

const ROWS = 7;
const HOURS = 24;
const MINUTES_PER_HOUR = 60;

// Hour grid: marks per hour column across the week for one label (or all labels).
export function buildHourGrid(synth, labelId, metric, weekStart) {
  const cells = Array.from({ length: ROWS }, () => new Array(HOURS).fill(0));
  const entriesUsed = [];
  for (const e of synth.entries) {
    const weight = labelId === null ? e.labels.length : (e.labels.includes(labelId) ? 1 : 0);
    if (weight === 0) continue;
    entriesUsed.push(e);
    const row = columnOf(e.date, weekStart);
    const col = Math.floor(e.minutes / MINUTES_PER_HOUR);
    cells[row][col] += weight;
  }
  let total = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < HOURS; c++) {
      total += cells[r][c];
    }
  }
  if (metric === 'share') {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < HOURS; c++) {
        cells[r][c] = total === 0 ? 0 : cells[r][c] / total;
      }
    }
  }
  let max = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < HOURS; c++) {
      if (cells[r][c] > max) max = cells[r][c];
    }
  }
  const title = labelId === null ? 'All labels' : synth.labels.find((l) => l.id === labelId).text;
  return {
    title,
    rows: weekdayLabels(weekStart),
    cols: HOURS,
    cells,
    max,
    total,
    metric,
    diversity: timeDiversity(entriesUsed, diversityCfg),
  };
}

// Hour dial: marks per hour bin for each label, over binCount bins that divide 24.
export function buildDial(synth, labelIds, binCount) {
  if (24 % binCount !== 0) {
    throw new Error('period-demo: binCount must divide 24');
  }
  const binsPerHour = 24 / binCount;
  const series = labelIds.map((id) => {
    const label = synth.labels.find((l) => l.id === id).text;
    const bins = new Array(binCount).fill(0);
    for (const e of synth.entries) {
      if (e.labels.includes(id)) {
        const hour = Math.floor(e.minutes / 60);
        bins[Math.floor(hour / binsPerHour)] += 1;
      }
    }
    return { label, bins };
  });
  let max = 0;
  let total = 0;
  for (const s of series) {
    for (const b of s.bins) {
      total += b;
      if (b > max) max = b;
    }
  }
  const entriesUsed = synth.entries.filter((e) => labelIds.some((id) => e.labels.includes(id)));
  return { series, max, total, diversity: timeDiversity(entriesUsed, diversityCfg) };
}
