// E2 Echo curve. Data (echo-demo.js buildE2Data): { eventLabel, outcomeLabel, baseline,
// points: [{ day, rate, lo, hi, n }] } with rate null when n is 0 (gap in the line).
// The band is a DEMO band (baseline +- bandFraction), not a placebo band; the subtitle says so.
import { svgDoc, svgText } from '../core/svg.js';
import { formatPercent } from '../core/format.js';
import { viewSettings } from '../config/views.js';

const c = viewSettings.curve;

function render(data) {
  const plotW = c.width - c.marginLeft - c.marginRight;
  const plotH = c.height - c.marginTop - c.marginBottom;
  const pts = data.points;
  const last = pts.length;
  const drawn = pts.filter((p) => p.rate !== null);
  const peak = Math.max(data.baseline, ...pts.map((p) => p.hi), ...drawn.map((p) => p.rate)) * c.yHeadroom;
  const top = peak > 0 ? peak : 1;
  const xOf = (day) => c.marginLeft + ((day - 1) / Math.max(last - 1, 1)) * plotW;
  const yOf = (v) => c.marginTop + plotH * (1 - v / top);
  const bottom = c.marginTop + plotH;

  const band = [...pts.map((p) => `${xOf(p.day)},${yOf(p.hi)}`), ...[...pts].reverse().map((p) => `${xOf(p.day)},${yOf(p.lo)}`)];
  let body = `<polygon class="band" points="${band.join(' ')}" opacity="${c.bandOpacity}"/>`;
  body += `<line class="baseline" x1="${c.marginLeft}" y1="${yOf(data.baseline)}" x2="${c.marginLeft + plotW}" y2="${yOf(data.baseline)}"/>`;
  body += `<line class="axis" x1="${c.marginLeft}" y1="${c.marginTop}" x2="${c.marginLeft}" y2="${bottom}"/>`;
  body += `<line class="axis" x1="${c.marginLeft}" y1="${bottom}" x2="${c.marginLeft + plotW}" y2="${bottom}"/>`;
  body += `<polyline class="line" points="${drawn.map((p) => `${xOf(p.day)},${yOf(p.rate)}`).join(' ')}"/>`;
  for (const p of drawn) {
    body += `<circle class="dot" cx="${xOf(p.day)}" cy="${yOf(p.rate)}" r="${c.pointRadius}"/>`;
  }
  body += svgText(c.marginLeft - c.fontSize / 3, yOf(0), formatPercent(0), 't-muted', 'end');
  body += svgText(c.marginLeft - c.fontSize / 3, yOf(top), formatPercent(top), 't-muted', 'end');
  body += svgText(xOf(1), bottom + c.fontSize, '1 day', 't-muted', 'start');
  body += svgText(xOf(last), bottom + c.fontSize, `${last} days`, 't-muted', 'end');
  body += svgText(c.marginLeft, c.marginTop / 2, `${data.eventLabel} to ${data.outcomeLabel}`, 't');
  body += svgText(c.marginLeft, c.height - c.marginBottom / 4,
    `days after exposure; demo band +-${formatPercent(c.bandFraction)} around baseline, not a placebo band`, 't-muted');

  return svgDoc({
    width: c.width,
    height: c.height,
    title: 'E2 Echo curve',
    desc: `Outcome rate by days after an exposure, with a demo band, ${data.eventLabel} to ${data.outcomeLabel}`,
    body,
  });
}

export default {
  id: 'E2',
  title: 'Echo curve',
  variants: [{ id: 'a', label: 'Curve' }],
  render,
};
