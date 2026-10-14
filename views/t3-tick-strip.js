// T3 Tick Strip. Data (time-demo.js buildStripData): { bins: [{ key, days, counts }], labels: [{ id, text }] }.
// One row per label over the last `strip.bins` months. Bar height = density (days with the label / days in the month).
// Printed beside each row: the last month's count, the change against the previous month (triangle path and number),
// and the trend over the months (least-squares slope of the density: rising, falling or flat).
// opts.width: available CSS px. The row is wider when the text needs it.
import { svgDoc, svgText } from '../core/svg.js';
import { viewSettings } from '../config/views.js';
import { estimateWidth } from '../core/textfit.js';

const S = viewSettings.time.strip;
const pad = viewSettings.time.pad;
const { fontPx, smallFontPx } = viewSettings.text;
const TRI_HALF = S.triHalf;
const TRI_HEIGHT = S.triHeight;

// Least-squares slope of counts against bin position (counts per month).
export function trendSlope(values) {
  const n = values.length;
  const meanX = (n - 1) / 2;
  const meanY = values.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  values.forEach((v, i) => {
    num += (i - meanX) * (v - meanY);
    den += (i - meanX) ** 2;
  });
  return den > 0 ? num / den : 0;
}

export function trendWord(slope) {
  if (Math.abs(slope) < S.trendFlatSlope) return 'flat';
  return slope > 0 ? 'rising' : 'falling';
}

export function densityOf(bin, count) {
  return bin.days > 0 ? count / bin.days : 0;
}

// Trend of the density the bars show. Raw counts scale with month length, so they are not used.
export function rowTrend(bins, counts) {
  return trendWord(trendSlope(bins.map((bin, b) => densityOf(bin, counts[b]))));
}

function triangle(cx, cy, delta) {
  if (delta > 0) return `<path class="tri-up" d="M${cx - TRI_HALF} ${cy + TRI_HEIGHT / 2} L${cx + TRI_HALF} ${cy + TRI_HEIGHT / 2} L${cx} ${cy - TRI_HEIGHT / 2} Z"/>`;
  if (delta < 0) return `<path class="tri-down" d="M${cx - TRI_HALF} ${cy - TRI_HEIGHT / 2} L${cx + TRI_HALF} ${cy - TRI_HEIGHT / 2} L${cx} ${cy + TRI_HEIGHT / 2} Z"/>`;
  const bar = TRI_HEIGHT / 4;
  return `<path class="tri-flat" d="M${cx - TRI_HALF} ${cy - bar} H${cx + TRI_HALF} V${cy + bar} H${cx - TRI_HALF} Z"/>`;
}

function signed(delta) {
  return delta > 0 ? `+${delta}` : String(delta);
}

function render(data, opts = {}) {
  const bins = data.bins.slice(-S.bins);
  const trendTexts = ['trend falling', 'trend rising', 'trend flat'];
  const labelWidth = Math.max(
    ...data.labels.map((l) => estimateWidth(l.text, fontPx)),
    ...trendTexts.map((t) => estimateWidth(t, smallFontPx)),
  );
  const x0 = pad + labelWidth + pad;
  const stripEnd = x0 + S.bins * S.barPitch;
  const countX = stripEnd + S.countGap;
  const triX = countX + estimateWidth('999', fontPx) + S.countGap + TRI_HALF;
  const deltaX = triX + TRI_HALF + S.countGap;
  const longestDelta = estimateWidth('-999', fontPx);
  const width = Math.max(opts.width || viewSettings.defaultWidth, deltaX + longestDelta + pad);
  const barBase = S.barMaxHeight;

  let body = '';
  data.labels.forEach((label, k) => {
    const y0 = k * S.rowHeight;
    const counts = bins.map((bin) => bin.counts[k]);
    const last = counts[counts.length - 1];
    const prev = counts.length > 1 ? counts[counts.length - 2] : last;
    const delta = last - prev;
    const cy = y0 + barBase / 2 + pad / 2;
    body += svgText(pad, y0 + pad + fontPx / 2, label.text, 't');
    body += svgText(pad, y0 + S.rowHeight - pad / 2 - smallFontPx / 2, `trend ${rowTrend(bins, counts)}`, 't-muted', 'start', smallFontPx);
    bins.forEach((bin, b) => {
      const density = densityOf(bin, counts[b]);
      const h = density * barBase;
      body += `<rect class="bar" x="${x0 + b * S.barPitch}" y="${y0 + barBase - h + pad / 2}" width="${S.barWidth}" height="${h}"/>`;
    });
    body += svgText(countX, cy, String(last), 't');
    body += triangle(triX, cy, delta);
    body += svgText(deltaX, cy, signed(delta), 't-muted');
  });

  return svgDoc({
    width,
    height: data.labels.length * S.rowHeight,
    title: 'T3 Tick strip',
    desc: `Monthly density of selected labels over ${bins.length} months, with last count, change and trend`,
    body,
  });
}

export default {
  id: 'T3',
  title: 'Tick strip',
  variants: [{ id: 'a', label: 'Strip' }],
  render,
};
