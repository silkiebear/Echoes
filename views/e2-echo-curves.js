// E2 Echo curve. Data (echo-demo.js buildE2Data): { eventLabel, outcomeLabel, baseline,
// points: [{ day, rate, lo, hi, n }] } with rate null when n is 0 (gap in the line).
// opts.width (CSS px, optional): the plot fills it down to minPlotWidth. The band is a DEMO band
// (baseline +- bandFraction), not a placebo band; the caption says so.
import { svgDoc, svgText } from '../core/svg.js';
import { formatPercent } from '../core/format.js';
import { viewSettings } from '../config/views.js';
import { wrapText } from '../core/textfit.js';

const c = viewSettings.curve;
const { fontPx, smallFontPx } = viewSettings.text;

function tickLabel(day) {
  return day === 1 ? '1 day' : `${day} days`;
}

function render(data, opts = {}) {
  const width = Math.max(opts.width || c.width, c.minPlotWidth + c.marginLeft + c.marginRight);
  const plotW = width - c.marginLeft - c.marginRight;
  const plotH = c.plotHeight;
  const pts = data.points;
  const last = pts.length;
  const drawn = pts.filter((p) => p.rate !== null);
  const peak = Math.max(data.baseline, ...pts.map((p) => p.hi), ...drawn.map((p) => p.rate)) * c.yHeadroom;
  const top = peak > 0 ? peak : 1;
  const xOf = (day) => c.marginLeft + ((day - 1) / Math.max(last - 1, 1)) * plotW;
  // The title wraps to the card width (4e.0.2); the plot starts below it. One line keeps marginTop, as before.
  const titleLines = wrapText(`${data.eventLabel} to ${data.outcomeLabel}`, fontPx, width - c.marginLeft - c.pad);
  const plotTop = Math.max(c.marginTop, titleLines.length * c.titleLineHeight);
  const yOf = (v) => plotTop + plotH * (1 - v / top);
  const bottom = plotTop + plotH;

  const band = [...pts.map((p) => `${xOf(p.day)},${yOf(p.hi)}`), ...[...pts].reverse().map((p) => `${xOf(p.day)},${yOf(p.lo)}`)];
  let body = `<polygon class="band" points="${band.join(' ')}" opacity="${c.bandOpacity}"/>`;
  body += `<line class="baseline" x1="${c.marginLeft}" y1="${yOf(data.baseline)}" x2="${c.marginLeft + plotW}" y2="${yOf(data.baseline)}"/>`;
  body += `<line class="axis" x1="${c.marginLeft}" y1="${plotTop}" x2="${c.marginLeft}" y2="${bottom}"/>`;
  body += `<line class="axis" x1="${c.marginLeft}" y1="${bottom}" x2="${c.marginLeft + plotW}" y2="${bottom}"/>`;
  body += `<polyline class="line" points="${drawn.map((p) => `${xOf(p.day)},${yOf(p.rate)}`).join(' ')}"/>`;
  for (const p of drawn) {
    body += `<circle class="dot" cx="${xOf(p.day)}" cy="${yOf(p.rate)}" r="${c.pointRadius}"/>`;
  }
  body += svgText(c.marginLeft - c.yLabelGap, yOf(0), formatPercent(0), 't-muted', 'end');
  body += svgText(c.marginLeft - c.yLabelGap, yOf(top), formatPercent(top), 't-muted', 'end');

  // x axis: ticks at 1, 7 and 14 days. The first label starts at its tick, the last ends at its tick.
  const xLabelY = bottom + c.tickLength + c.xLabelGap + smallFontPx / 2;
  c.tickDays.forEach((day, i) => {
    const x = xOf(day);
    const anchor = i === 0 ? 'start' : i === c.tickDays.length - 1 ? 'end' : 'middle';
    body += `<line class="axis" x1="${x}" y1="${bottom}" x2="${x}" y2="${bottom + c.tickLength}"/>`;
    body += svgText(x, xLabelY, tickLabel(day), 't-muted', anchor, smallFontPx);
  });

  // Caption: wrapped by estimated width into its own band below the x labels.
  const captionTop = xLabelY + smallFontPx / 2 + c.captionGap;
  // opts.caption and opts.desc (phase 4d, 4d.4): the real-data card states its own band; without them the demo text is kept.
  const caption = wrapText(
    opts.caption ?? `days after exposure; demo band +-${formatPercent(c.bandFraction)} around baseline, not a placebo band`,
    smallFontPx,
    width - 2 * c.pad,
  );
  caption.forEach((line, i) => {
    body += svgText(c.pad, captionTop + smallFontPx / 2 + i * c.captionLineHeight, line, 't-muted', 'start', smallFontPx);
  });
  const titleFirst = plotTop / 2 - ((titleLines.length - 1) * c.titleLineHeight) / 2;
  titleLines.forEach((line, i) => {
    body += svgText(c.marginLeft, titleFirst + i * c.titleLineHeight, line, 't', 'start', fontPx);
  });

  const height = captionTop + caption.length * c.captionLineHeight + c.pad;
  return svgDoc({
    width,
    height,
    title: 'E2 Echo curve',
    desc: opts.desc ?? `Outcome rate by days after an exposure, with a demo band, ${data.eventLabel} to ${data.outcomeLabel}`,
    body,
  });
}

export default {
  id: 'E2',
  title: 'Echo curve',
  variants: [{ id: 'a', label: 'Curve' }],
  render,
};
