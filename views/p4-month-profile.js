// P4 Month profile. Data (core/profile-demo.js buildMonthProfile): { title, rows: [{ month, rate, n }], baseline }.
import { svgDoc, svgText } from '../core/svg.js';
import { viewSettings } from '../config/views.js';
import { formatPercent } from '../core/format.js';
import { monthShort } from '../core/time-demo.js';

const P = viewSettings.time.profile;
const pad = viewSettings.time.pad;
const small = viewSettings.text.smallFontPx;
const { barWidth, barGap, plotHeight, marginLeft, minPlotWidth } = P;

const MIN_MAX_RATE = 0.1; // y axis is never shorter than this share.

function render(data, opts = {}) {
  const available = opts.width || viewSettings.defaultWidth;
  const rows = data.rows;
  const plotW = Math.max(minPlotWidth, available - marginLeft - pad);
  const pitch = Math.max(barWidth + barGap, Math.floor(plotW / rows.length));
  const barW = Math.max(1, Math.min(barWidth, pitch - barGap));
  const x0 = marginLeft;
  const maxRate = Math.max(data.baseline, MIN_MAX_RATE, ...rows.map((r) => r.rate));
  const plotTop = pad + small + pad;
  const y = (rate) => plotTop + plotHeight * (1 - rate / maxRate);
  const baseY = y(data.baseline);
  const plotRight = x0 + rows.length * pitch;
  let body = '';
  body += svgText(marginLeft - pad / 2, y(0), formatPercent(0), 't-muted', 'end', small);
  body += svgText(marginLeft - pad / 2, y(maxRate), formatPercent(maxRate), 't-muted', 'end', small);
  body += `<line class="axis" x1="${marginLeft}" y1="${plotTop}" x2="${marginLeft}" y2="${plotTop + plotHeight}"/>`;
  body += `<line class="baseline" x1="${marginLeft}" y1="${baseY}" x2="${plotRight}" y2="${baseY}"/>`;
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const bx = x0 + i * pitch + (pitch - barW) / 2;
    const centreX = bx + barW / 2;
    const barTop = y(row.rate);
    const barH = plotHeight * (row.rate / maxRate);
    body += `<rect class="bar" x="${bx}" y="${barTop}" width="${barW}" height="${barH}" rx="2"/>`;
    body += svgText(centreX, Math.max(plotTop, barTop - pad / 2), formatPercent(row.rate), 't', 'middle', small);
    body += svgText(centreX, plotTop + plotHeight + pad + small / 2, monthShort(row.month), 't-muted', 'middle', small);
    // Days with the label in this month (phase 4c, 4c.3): rate x n is the count, exact up to rounding. The bar height is
    // the share of the observed days in this month, which the card note says.
    body += svgText(centreX, plotTop + plotHeight + pad + small * 1.5 + pad / 2, String(Math.round(row.rate * row.n)), 't-muted', 'middle', small);
  }
  const nY = plotTop + plotHeight + pad + small * 1.5 + pad / 2;
  const width = plotRight + pad;
  const height = nY + small + pad;
  return svgDoc({ width, height, title: 'P4 Month profile', desc: 'Share of days with the label, by month (years pooled), with the overall baseline', body });
}

export default { id: 'P4', title: 'Month profile', variants: [], render };
