// E1 Echo Matrix. Data (echo-demo.js buildE1Data): { outcomes: [{id, label}], windows: [{id, label}],
// cells: cells[o][w] = { rr, diff, nExposed, flags, forced } | { rr: null } }.
// opts.variant: 'a' prints the rate ratio in each cell; 'b' sizes a dot by nExposed. opts.width is ignored:
// the grid has a fixed size and scrolls inside its card.
// Flagged cells get a dashed outline; flags in `forced` are DEMO-only and say so in the tooltip.
// Texts wrap (phase 4e): window headers to the cell width, outcome labels to the label column (a row grows only for a
// label of three lines or more), the caption to the grid width. One line keeps the layout the views had before.
import { svgDoc, svgText } from '../core/svg.js';
import { formatRatio } from '../core/format.js';
import { viewSettings } from '../config/views.js';
import { binOf, legendSvg } from './diverge.js';
import { wrapText } from '../core/textfit.js';

const m = viewSettings.matrix;
const fontPx = viewSettings.text.fontPx;

function flagTitle(cell) {
  return cell.flags.map((f) => (cell.forced.includes(f) ? `${f} (DEMO)` : f)).join(', ');
}

function cellSvg(cell, x, y, h, variant) {
  const cls = cell.rr === null ? 'na' : `bin-${binOf(cell.rr)}`;
  const cx = x + m.cellWidth / 2;
  const cy = y + h / 2;
  let out = `<rect class="${cls}" x="${x}" y="${y}" width="${m.cellWidth}" height="${h}"/>`;
  if (cell.rr === null) {
    out += svgText(cx, cy, 'n/a', 't-muted', 'middle');
    return out;
  }
  if (variant === 'a') {
    out += svgText(cx, cy, formatRatio(cell.rr), 't', 'middle');
  } else {
    const radius = m.dotMaxRadius * Math.sqrt(Math.min(cell.nExposed, m.dotRefN) / m.dotRefN);
    out += `<circle class="dot" cx="${cx}" cy="${cy}" r="${radius.toFixed(2)}"/>`;
  }
  if (cell.flags.length > 0) {
    out += `<rect class="flag-outline" x="${x}" y="${y}" width="${m.cellWidth}" height="${h}"><title>${flagTitle(cell)}</title></rect>`;
  }
  return out;
}

function render(data, opts = {}) {
  const variant = opts.variant === 'b' ? 'b' : 'a';
  const x0 = m.margin + m.labelWidth;
  const y0 = m.headerHeight;
  const labels = data.outcomes.map((o) => wrapText(o.label, fontPx, m.labelWidth));
  const heights = labels.map((lines) => Math.max(m.cellHeight, lines.length * m.labelLineHeight));
  const legendTop = y0 + heights.reduce((sum, h) => sum + h, 0) + m.margin;
  const width = x0 + data.windows.length * m.cellWidth + m.margin;

  // Caption on its own row (wrapped to the grid width); the legend bar starts below its last line.
  const note = variant === 'a'
    ? 'rate ratio in cell; flagged = dashed outline'
    : 'dot size = exposed days; flagged = dashed outline';
  const noteLines = wrapText(note, fontPx, width - 2 * m.margin);
  const barY = legendTop + fontPx + (noteLines.length - 1) * m.labelLineHeight + m.captionGap;
  const height = barY + m.legendHeight - fontPx - m.captionGap + m.margin;

  let body = '';
  data.windows.forEach((win, j) => {
    const lines = wrapText(win.label, fontPx, m.cellWidth);
    const first = m.headerHeight - m.headerGap - (lines.length - 1) * m.labelLineHeight;
    lines.forEach((line, k) => {
      body += svgText(x0 + j * m.cellWidth + m.cellWidth / 2, first + k * m.labelLineHeight, line, 't-muted', 'middle');
    });
  });
  let y = y0;
  data.outcomes.forEach((outcome, i) => {
    const h = heights[i];
    const lines = labels[i].length > 0 ? labels[i] : [''];
    const first = y + h / 2 - ((lines.length - 1) * m.labelLineHeight) / 2;
    lines.forEach((line, k) => {
      body += svgText(x0 - m.labelGap, first + k * m.labelLineHeight, line, 't', 'end');
    });
    data.cells[i].forEach((cell, j) => {
      body += cellSvg(cell, x0 + j * m.cellWidth, y, h, variant);
    });
    y += h;
  });
  noteLines.forEach((line, k) => {
    body += svgText(m.margin, legendTop + fontPx / 2 + k * m.labelLineHeight, line, 't-muted');
  });
  body += legendSvg(x0, barY);

  return svgDoc({
    width,
    height,
    title: 'E1 Echo matrix',
    desc: `Outcomes by echo windows, ${variant === 'a' ? 'rate ratio' : 'dot size'}, flagged cells outlined`,
    body,
  });
}

export default {
  id: 'E1',
  title: 'Echo matrix',
  variants: [
    { id: 'a', label: 'Rate ratio' },
    { id: 'b', label: 'Dot = n' },
  ],
  render,
};
