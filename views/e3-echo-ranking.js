// E3 Echo ranking. Data (echo-demo.js buildE3Data): { rows: [{ rank, exposureLabel, outcomeLabel,
// windowLabel, rr, diff, nExposed, flags, forced }] }. opts.hideFlagged (default false) drops rows with any flag.
// Each flag is a pill with its short text; forced flags (demo only) are prefixed DEMO.
import { svgDoc, svgText } from '../core/svg.js';
import { formatRatio, formatNumber } from '../core/format.js';
import { viewSettings } from '../config/views.js';
import { flags } from '../config/flags.js';

const r = viewSettings.ranking;
const PAD = r.pillPadding;

function shortOf(id) {
  const flag = flags.find((f) => f.id === id);
  return flag ? flag.short : id;
}

function pillsSvg(row, x0, y) {
  let x = x0;
  let out = '';
  for (const id of row.flags) {
    const demo = row.forced.includes(id);
    const text = demo ? `DEMO ${shortOf(id)}` : shortOf(id);
    const width = text.length * r.pillCharWidth + 2 * PAD;
    out += `<rect class="pill" x="${x}" y="${y}" width="${width}" height="${r.pillHeight}" rx="${r.pillHeight / 2}"/>`;
    out += svgText(x + width / 2, y + r.pillHeight / 2, text, 't', 'middle');
    x += width + r.pillGap;
  }
  return out;
}

function rowSvg(row, index) {
  const y0 = index * r.rowHeight;
  const flagged = row.flags.length > 0;
  let out = `<rect class="row-bg" x="0" y="${y0 + 2}" width="${r.width}" height="${r.rowHeight - 4}" rx="8"/>`;
  if (flagged) out += `<rect class="flag-outline" x="0" y="${y0 + 2}" width="${r.width}" height="${r.rowHeight - 4}" rx="8"/>`;
  out += svgText(PAD, y0 + 16, `${row.rank}. ${row.exposureLabel} to ${row.outcomeLabel}`, 't');
  out += svgText(PAD, y0 + 32, `${row.windowLabel}  rate ratio ${formatRatio(row.rr)}  n = ${formatNumber(row.nExposed)}`, 't-muted');
  out += pillsSvg(row, PAD, y0 + 36);
  return out;
}

function render(data, opts = {}) {
  const rows = opts.hideFlagged ? data.rows.filter((row) => row.flags.length === 0) : data.rows;
  let body = '';
  if (rows.length === 0) {
    body = svgText(PAD, r.rowHeight / 2, 'All results hidden by the flag filter', 't-muted');
  } else {
    rows.forEach((row, i) => {
      body += rowSvg(row, i);
    });
  }
  return svgDoc({
    width: r.width,
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
