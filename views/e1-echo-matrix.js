// E1 Echo Matrix. Data (echo-demo.js buildE1Data): { outcomes: [{id, label}], windows: [{id, label}],
// cells: cells[o][w] = { rr, diff, nExposed, flags, forced } | { rr: null } }.
// opts.variant: 'a' prints the rate ratio in each cell; 'b' sizes a dot by nExposed.
// Flagged cells get a dashed outline; flags in `forced` are DEMO-only and say so in the tooltip.
import { svgDoc, svgText } from '../core/svg.js';
import { formatRatio } from '../core/format.js';
import { viewSettings } from '../config/views.js';
import { binOf, legendSvg } from './diverge.js';

const m = viewSettings.matrix;

function flagTitle(cell) {
  return cell.flags.map((f) => (cell.forced.includes(f) ? `${f} (DEMO)` : f)).join(', ');
}

function cellSvg(cell, x, y, variant) {
  const cls = cell.rr === null ? 'na' : `bin-${binOf(cell.rr)}`;
  const cx = x + m.cellWidth / 2;
  const cy = y + m.cellHeight / 2;
  let out = `<rect class="${cls}" x="${x}" y="${y}" width="${m.cellWidth}" height="${m.cellHeight}"/>`;
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
    out += `<rect class="flag-outline" x="${x}" y="${y}" width="${m.cellWidth}" height="${m.cellHeight}"><title>${flagTitle(cell)}</title></rect>`;
  }
  return out;
}

function render(data, opts = {}) {
  const variant = opts.variant === 'b' ? 'b' : 'a';
  const x0 = m.margin + m.labelWidth;
  const y0 = m.headerHeight;
  const legendTop = y0 + data.outcomes.length * m.cellHeight + m.margin;
  const width = x0 + data.windows.length * m.cellWidth + m.margin;
  const height = legendTop + m.legendHeight + m.margin;

  let body = '';
  data.windows.forEach((win, j) => {
    body += svgText(x0 + j * m.cellWidth + m.cellWidth / 2, m.headerHeight - m.margin, win.label, 't-muted', 'middle');
  });
  data.outcomes.forEach((outcome, i) => {
    const y = y0 + i * m.cellHeight;
    body += svgText(x0 - m.margin / 2, y + m.cellHeight / 2, outcome.label, 't', 'end');
    data.cells[i].forEach((cell, j) => {
      body += cellSvg(cell, x0 + j * m.cellWidth, y, variant);
    });
  });

  const note = variant === 'a'
    ? 'rate ratio in cell; flagged = dashed outline'
    : 'dot size = exposed days; flagged = dashed outline';
  body += svgText(m.margin, legendTop + m.fontSize, note, 't-muted');
  body += legendSvg(x0, legendTop + m.fontSize + m.margin / 2);

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
