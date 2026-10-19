// E4 Before/after shift. Data (core/event-study-demo.js buildE4Data): { eventLabel, windowDays, nEvents, rows: [{ outcomeLabel, before, after, diff, flags }] }.
// Texts wrap (phase 4e): the caption to the card width, outcome labels to the label column (at most labelMaxWidth; a row
// grows only for a label of two lines or more). One line keeps the layout the view had before.
import { svgDoc, svgText } from '../core/svg.js';
import { viewSettings } from '../config/views.js';
import { estimateWidth, wrapText } from '../core/textfit.js';

const E = viewSettings.eventStudy.view;
const pad = viewSettings.time.pad;
const small = viewSettings.text.smallFontPx;
const pillText = 'lowSample';
const pillExplain = 'Few events, so the difference is unstable. Demo flag only: no placebo test or FDR correction.';
const { barHeight, rowGap, shadeBins, maxBarWidth, labelMin, labelMaxWidth, lineHeight } = E;
const barMinArea = 2 * maxBarWidth;
const NEG_CLASS = ['bin-3', 'bin-2', 'bin-1', 'bin-1'];
const POS_CLASS = ['bin-5', 'bin-6', 'bin-7', 'bin-7'];

function render(data, opts = {}) {
  const available = opts.width || viewSettings.defaultWidth;
  const captionText = `Events: ${data.nEvents}, window ${data.windowDays} days before and after, exposure: ${data.eventLabel}`;
  const captionLines = wrapText(captionText, small, available - 2 * pad);
  let body = '';
  captionLines.forEach((line, i) => {
    body += svgText(pad, pad + small / 2 + i * lineHeight, line, 't-muted', 'start', small);
  });
  const captionY = pad + small + (captionLines.length - 1) * lineHeight;
  if (!data.nEvents || !data.rows.length) {
    body += svgText(pad, captionY + small + pad, 'No events', 't-muted', 'start', small);
    return svgDoc({
      width: available,
      height: captionY + small + pad + small + pad,
      title: 'E4 Before and after',
      desc: 'Change in the share of days with each outcome after an event',
      body,
    });
  }
  let rowTop = captionY;
  if (data.rows[0].flags.includes('lowSample')) {
    const pillY = captionY + pad;
    body += `<rect class="pill" x="${pad}" y="${pillY}" width="${estimateWidth(pillText, small) + 2 * pad}" height="${small + pad}" rx="${small}"/>`;
    body += svgText(pad + pad, pillY + (small + pad) / 2, pillText, 't-muted', 'start', small);
    const lines = wrapText(pillExplain, small, available - 2 * pad);
    for (let i = 0; i < lines.length; i++) {
      body += svgText(pad, pillY + small + pad + i * (small + pad / 2), lines[i], 't-muted', 'start', small);
    }
    rowTop = pillY + small + pad + lines.length * (small + pad / 2);
  }
  const widest = Math.max(...data.rows.map((r) => estimateWidth(r.outcomeLabel, small)));
  const labelWidth = Math.max(labelMin, Math.min(widest, labelMaxWidth));
  const labels = data.rows.map((r) => {
    const lines = wrapText(r.outcomeLabel, small, labelWidth);
    return lines.length > 0 ? lines : [''];
  });
  const barStart = pad + labelWidth + pad;
  const valueRoom = estimateWidth('-0.000', small) + pad;
  const barArea = Math.max(barMinArea, available - barStart - valueRoom - pad);
  const zeroX = barStart + barArea / 2;
  let maxAbs = 0;
  for (const r of data.rows) {
    const a = Math.abs(r.diff);
    if (a > maxAbs) maxAbs = a;
  }
  if (maxAbs === 0) maxAbs = 1;
  let y = rowTop;
  data.rows.forEach((r, i) => {
    const lines = labels[i];
    const rowH = Math.max(barHeight, lines.length * lineHeight);
    const cy = y + rowH / 2;
    const first = cy - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, k) => {
      body += svgText(pad, first + k * lineHeight, line, 't', 'start', small);
    });
    const step = Math.min(shadeBins, Math.max(1, Math.ceil((Math.abs(r.diff) / maxAbs) * shadeBins)));
    const len = (Math.abs(r.diff) / maxAbs) * (barArea / 2);
    const cls = r.diff < 0 ? NEG_CLASS[step - 1] : POS_CLASS[step - 1];
    const bx = r.diff < 0 ? zeroX - len : zeroX;
    body += `<rect class="${cls}" x="${bx}" y="${cy - barHeight / 2}" width="${Math.max(len, 1)}" height="${barHeight}" rx="2"/>`;
    const s = r.diff > 0 ? '+' + r.diff.toFixed(2) : r.diff.toFixed(2);
    body += svgText(barStart + barArea + pad, cy, s, 't-muted', 'start', small);
    y += rowH + rowGap;
  });
  const bottom = y;
  body += `<line class="axis" x1="${zeroX}" y1="${rowTop - pad / 2}" x2="${zeroX}" y2="${bottom}"/>`;
  const width = barStart + barArea + valueRoom + pad;
  const height = bottom + pad;
  return svgDoc({
    width,
    height,
    title: 'E4 Before and after',
    desc: 'Change in the share of days with each outcome after an event',
    body,
  });
}

export default {
  id: 'E4',
  title: 'Before/after shift',
  variants: [],
  render,
};
