// P1 Weekday by Hour. Data (core/period-demo.js buildHourGrid): { title, rows, cols, cells, max, total, metric, diversity: { low } }.
import { svgDoc, svgText } from '../core/svg.js';
import { viewSettings } from '../config/views.js';
import { estimateWidth, wrapText } from '../core/textfit.js';

const P = viewSettings.time.periodic.p1;
const pad = viewSettings.time.pad;
const small = viewSettings.text.smallFontPx;
const pill = viewSettings.time.periodic.pillText;
const explain = viewSettings.time.periodic.pillExplain;
const steps = P.steps;
const { gap, gutter, topBand, cellMin, cellMax, rowLabelGap, hourTicks } = P;

function render(data, opts = {}) {
  const available = opts.width || viewSettings.defaultWidth;
  const room = Math.floor((available - gutter - pad) / data.cols) - gap;
  const size = Math.min(cellMax, Math.max(cellMin, room));
  const pitch = size + gap;
  const x0 = gutter;
  const y0 = topBand;
  const gridW = x0 + data.cols * pitch - gap + pad;
  const gridH = y0 + data.rows.length * pitch - gap;
  let body = '';
  for (const h of hourTicks) {
    body += svgText(x0 + h * pitch + size / 2, topBand / 2, String(h), 't-muted', 'middle', small);
  }
  for (let r = 0; r < data.rows.length; r++) {
    body += svgText(x0 - rowLabelGap, y0 + r * pitch + size / 2, data.rows[r], 't-muted', 'end', small);
  }
  for (let r = 0; r < data.rows.length; r++) {
    for (let c = 0; c < data.cols; c++) {
      const value = data.cells[r][c];
      const cls = value === 0 ? 'na' : 'seq-' + Math.min(steps, Math.max(1, Math.ceil((value / data.max) * steps)));
      body += `<rect class="${cls}" x="${x0 + c * pitch}" y="${y0 + r * pitch}" width="${size}" height="${size}" rx="2"/>`;
    }
  }
  const legendY = gridH + pad;
  const fewerW = estimateWidth('fewer', small);
  body += svgText(x0, legendY + size / 2, 'fewer', 't-muted', 'start', small);
  for (let k = 1; k <= steps; k++) {
    const sx = x0 + fewerW + pad + (k - 1) * (size + gap);
    body += `<rect class="seq-${k}" x="${sx}" y="${legendY}" width="${size}" height="${size}"/>`;
  }
  const moreX = x0 + fewerW + pad + (steps - 1) * (size + gap) + size + gap;
  body += svgText(moreX, legendY + size / 2, 'more', 't-muted', 'start', small);
  const legendEnd = moreX + estimateWidth('more', small);
  let pillW = 0;
  let bottom = legendY + size;
  if (data.diversity && data.diversity.low) {
    const pillY = legendY + size + pad;
    const tw = estimateWidth(pill, small);
    pillW = tw + 2 * pad;
    body += `<rect class="pill" x="${x0}" y="${pillY}" width="${pillW}" height="${small + pad}" rx="${small}"/>`;
    body += svgText(x0 + pad, pillY + (small + pad) / 2, pill, 't-muted', 'start', small);
    const lines = wrapText(explain, small, Math.max(gridW - x0, 0));
    for (let i = 0; i < lines.length; i++) {
      body += svgText(x0, pillY + small + pad + small + i * (small + gap), lines[i], 't-muted', 'start', small);
    }
    bottom = pillY + small + pad + small + (lines.length - 1) * (small + gap) + small;
  }
  const width = data.diversity && data.diversity.low
    ? Math.max(gridW, legendEnd + pad, x0 + pillW + pad)
    : Math.max(gridW, legendEnd + pad);
  const height = bottom + pad;
  return svgDoc({
    width,
    height,
    title: 'P1 Weekday by hour',
    desc: data.metric + ' of marks by weekday and hour',
    body,
  });
}

export default {
  id: 'P1',
  title: 'Weekday by hour',
  variants: [],
  render,
};
