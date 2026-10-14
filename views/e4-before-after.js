// E4 Before/after shift. Data (core/event-study-demo.js buildE4Data): { eventLabel, windowDays, nEvents, rows: [{ outcomeLabel, before, after, diff, flags }] }.
import { svgDoc, svgText } from '../core/svg.js';
import { viewSettings } from '../config/views.js';
import { estimateWidth, wrapText } from '../core/textfit.js';

const E = viewSettings.eventStudy.view;
const pad = viewSettings.time.pad;
const small = viewSettings.text.smallFontPx;
const pillText = 'lowSample';
const pillExplain = 'Few events, so the difference is unstable. Demo flag only: no placebo test or FDR correction.';
const { barHeight, rowGap, shadeBins, maxBarWidth, labelMin } = E;
const barMinArea = 2 * maxBarWidth;
const NEG_CLASS = ['bin-3', 'bin-2', 'bin-1', 'bin-1'];
const POS_CLASS = ['bin-5', 'bin-6', 'bin-7', 'bin-7'];

function render(data, opts = {}) {
  const available = opts.width || viewSettings.defaultWidth;
  const captionText = `Events: ${data.nEvents}, window ${data.windowDays} days before and after, exposure: ${data.eventLabel}`;
  const caption = svgText(pad, pad + small / 2, captionText, 't-muted', 'start', small);
  const captionW = estimateWidth(captionText, small);
  const captionY = pad + small;
  let body = caption;
  if (!data.nEvents || !data.rows.length) {
    body += svgText(pad, captionY + small + pad, 'No events', 't-muted', 'start', small);
    return svgDoc({
      width: Math.max(available, captionW + 2 * pad),
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
  const labelWidth = Math.max(labelMin, Math.max(...data.rows.map((r) => estimateWidth(r.outcomeLabel, small))));
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
  for (let i = 0; i < data.rows.length; i++) {
    const r = data.rows[i];
    const y = rowTop + i * (barHeight + rowGap);
    body += svgText(pad, y + barHeight / 2, r.outcomeLabel, 't', 'start', small);
    const step = Math.min(shadeBins, Math.max(1, Math.ceil((Math.abs(r.diff) / maxAbs) * shadeBins)));
    const len = (Math.abs(r.diff) / maxAbs) * (barArea / 2);
    const cls = r.diff < 0 ? NEG_CLASS[step - 1] : POS_CLASS[step - 1];
    const bx = r.diff < 0 ? zeroX - len : zeroX;
    body += `<rect class="${cls}" x="${bx}" y="${y}" width="${Math.max(len, 1)}" height="${barHeight}" rx="2"/>`;
    const s = r.diff > 0 ? '+' + r.diff.toFixed(2) : r.diff.toFixed(2);
    body += svgText(barStart + barArea + pad, y + barHeight / 2, s, 't-muted', 'start', small);
  }
  const bottom = rowTop + data.rows.length * (barHeight + rowGap);
  body += `<line class="axis" x1="${zeroX}" y1="${rowTop - pad / 2}" x2="${zeroX}" y2="${bottom}"/>`;
  const width = Math.max(barStart + barArea + valueRoom + pad, captionW + 2 * pad);
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
