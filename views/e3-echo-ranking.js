// E3 Echo ranking. Data (echo-demo.js buildE3Data): { rows: [{ rank, exposureLabel, outcomeLabel,
// windowLabel, rr, diff, nExposed, flags, forced }] }. opts.hideFlagged (default false) drops rows with any flag.
// opts.width (CSS px, optional): the row width; wider text makes the row wider (the card scrolls).
// Each flag is a pill on its own line with its short text; forced flags (demo only) are prefixed DEMO.
import { svgDoc, svgText } from '../core/svg.js';
import { formatRatio, formatNumber } from '../core/format.js';
import { viewSettings } from '../config/views.js';
import { flags } from '../config/flags.js';
import { estimateWidth } from '../core/textfit.js';

const r = viewSettings.ranking;
const fontPx = viewSettings.text.fontPx;

function shortOf(id) {
  const flag = flags.find((f) => f.id === id);
  return flag ? flag.short : id;
}

function pillText(row, id) {
  return row.forced.includes(id) ? `DEMO ${shortOf(id)}` : shortOf(id);
}

function pillWidth(text) {
  return estimateWidth(text, fontPx) + 2 * r.pillPadding;
}

function titleOf(row) {
  return `${row.rank}. ${row.exposureLabel} to ${row.outcomeLabel}`;
}

function metaOf(row) {
  return `${row.windowLabel}  rate ratio ${formatRatio(row.rr)}  n = ${formatNumber(row.nExposed)}`;
}

// Width the row needs so that no text or pill runs past the right edge.
function neededWidth(row) {
  let pills = 0;
  for (const id of row.flags) pills += pillWidth(pillText(row, id)) + r.pillGap;
  return 2 * r.pad + Math.max(estimateWidth(titleOf(row), fontPx), estimateWidth(metaOf(row), fontPx), pills);
}

function pillsSvg(row, x0, y) {
  let x = x0;
  let out = '';
  for (const id of row.flags) {
    const text = pillText(row, id);
    const width = pillWidth(text);
    out += `<rect class="pill" x="${x}" y="${y}" width="${width}" height="${r.pillHeight}" rx="${r.pillHeight / 2}"/>`;
    out += svgText(x + width / 2, y + r.pillHeight / 2, text, 't', 'middle');
    x += width + r.pillGap;
  }
  return out;
}

function rowSvg(row, index, width) {
  const y0 = index * r.rowHeight;
  const flagged = row.flags.length > 0;
  const inset = r.rowInset;
  let out = `<rect class="row-bg" x="0" y="${y0 + inset}" width="${width}" height="${r.rowHeight - 2 * inset}" rx="${r.rowRadius}"/>`;
  if (flagged) out += `<rect class="flag-outline" x="0" y="${y0 + inset}" width="${width}" height="${r.rowHeight - 2 * inset}" rx="${r.rowRadius}"/>`;
  out += svgText(r.pad, y0 + r.titleY, titleOf(row), 't');
  out += svgText(r.pad, y0 + r.metaY, metaOf(row), 't-muted');
  out += pillsSvg(row, r.pad, y0 + r.pillTop);
  return out;
}

function render(data, opts = {}) {
  const rows = opts.hideFlagged ? data.rows.filter((row) => row.flags.length === 0) : data.rows;
  const needed = Math.max(0, ...rows.map(neededWidth));
  const width = Math.max(opts.width || viewSettings.defaultWidth, needed);
  let body = '';
  if (rows.length === 0) {
    body = svgText(r.pad, r.rowHeight / 2, 'All results hidden by the flag filter', 't-muted');
  } else {
    rows.forEach((row, i) => {
      body += rowSvg(row, i, width);
    });
  }
  return svgDoc({
    width,
    height: Math.max(rows.length, 1) * r.rowHeight,
    title: 'E3 Echo ranking',
    desc: `Top echoes by rate ratio with flag badges${opts.hideFlagged ? ', flagged rows hidden' : ''}`,
    body,
  });
}

export default {
  id: 'E3',
  title: 'Echo ranking',
  variants: [{ id: 'a', label: 'Ranking' }],
  render,
};
