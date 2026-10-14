// T1 Year Grid. Data (time-demo.js buildYearData): { year, firstRow, days: [{ index, row, month, dom, mood, present }] }.
// row is the position in the week (0 = time.weekStart), firstRow is the row of 1 January.
// opts.variant: 'a' columns = weeks, rows = weekdays; 'b' rows = months, columns = days 1 to 31.
// opts.metric: 'mood' (five steps on the colour bins) or 'label' (present or absent). opts.width: available CSS px.
// The grid scrolls inside its card when the cells reach cellMin. Zoom comes from the gallery (attachZoom).
// Decade-to-day levels are deferred: not in this phase.
import { svgDoc, svgText } from '../core/svg.js';
import { viewSettings } from '../config/views.js';
import { moodBin, presenceBin, moodLegend, keyRow } from './diverge.js';
import { monthShort } from '../core/time-demo.js';
import { weekdayLabels } from '../core/calendar.js';

const t = viewSettings.time;
const g = t.yearGrid;
const small = viewSettings.text.smallFontPx;
const WEEKS = 7;
const MONTHS = 12;
const MAX_DAYS = 31;

// Cell size that fits `count` cells (plus the left gutter) in the available width, within the config limits.
function fitCell(available, count, minCell) {
  const room = Math.floor((available - g.gutter - t.pad) / count) - g.gap;
  return Math.min(g.cellMax, Math.max(minCell, room));
}

function binOf(day, metric) {
  return metric === 'label' ? presenceBin(day.present) : moodBin(day.mood);
}

function cell(x, y, size, bin) {
  return `<rect class="bin-${bin}" x="${x}" y="${y}" width="${size}" height="${size}" rx="2"/>`;
}

function weeksGrid(data, metric, available) {
  const cols = Math.ceil((data.days.length + data.firstRow) / WEEKS);
  const size = fitCell(available, cols, g.cellMin);
  const pitch = size + g.gap;
  const x0 = g.gutter;
  const y0 = g.topBand;
  const names = weekdayLabels(t.weekStart);
  let body = '';
  for (let m = 0; m < MONTHS; m++) {
    const first = data.days.find((d) => d.month === m && d.dom === 1);
    if (!first) continue;
    const col = Math.floor((first.index + data.firstRow) / WEEKS);
    body += svgText(x0 + col * pitch, g.topBand / 2, monthShort(m), 't-muted', 'start', small);
  }
  for (const row of g.weekdayRows) {
    body += svgText(x0 - t.smallGap, y0 + row * pitch + size / 2, names[row], 't-muted', 'end', small);
  }
  for (const d of data.days) {
    const col = Math.floor((d.index + data.firstRow) / WEEKS);
    body += cell(x0 + col * pitch, y0 + d.row * pitch, size, binOf(d, metric));
  }
  return { body, gridWidth: x0 + cols * pitch - g.gap + t.pad, gridHeight: y0 + WEEKS * pitch - g.gap };
}

function monthsGrid(data, metric, available) {
  const size = fitCell(available, MAX_DAYS, g.monthCellMin);
  const pitch = size + g.gap;
  const x0 = g.gutter;
  const y0 = g.topBand;
  let body = '';
  for (const day of g.dayLabels) {
    body += svgText(x0 + (day - 1) * pitch + size / 2, g.topBand / 2, String(day), 't-muted', 'middle', small);
  }
  for (let m = 0; m < MONTHS; m++) {
    body += svgText(x0 - t.smallGap, y0 + m * pitch + size / 2, monthShort(m), 't-muted', 'end', small);
  }
  for (const d of data.days) {
    body += cell(x0 + (d.dom - 1) * pitch, y0 + d.month * pitch, size, binOf(d, metric));
  }
  return { body, gridWidth: x0 + MAX_DAYS * pitch - g.gap + t.pad, gridHeight: y0 + MONTHS * pitch - g.gap };
}

function render(data, opts = {}) {
  const available = opts.width || viewSettings.defaultWidth;
  const metric = opts.metric === 'label' ? 'label' : 'mood';
  const grid = opts.variant === 'b' ? monthsGrid(data, metric, available) : weeksGrid(data, metric, available);
  const keyY = grid.gridHeight + t.pad;
  const key = metric === 'label'
    ? keyRow(g.gutter, keyY, [{ bin: presenceBin(0), name: 'absent' }, { bin: presenceBin(1), name: 'present' }])
    : moodLegend(g.gutter, keyY);
  const width = Math.max(grid.gridWidth, g.gutter + key.width + t.pad);
  const height = keyY + t.moodSwatch + t.pad;
  return svgDoc({
    width,
    height,
    title: `T1 Year grid ${data.year}`,
    desc: `${data.year}, ${opts.variant === 'b' ? 'months by day' : 'weeks by weekday'}, ${metric === 'label' ? 'label present' : 'mood'}`,
    body: grid.body + key.svg,
  });
}

export default {
  id: 'T1',
  title: 'Year grid',
  variants: [
    { id: 'a', label: 'Weeks' },
    { id: 'b', label: 'Months' },
  ],
  render,
};
