// 24-hour dial: marks by hour of day, as wedges (a) or stacked rings (b). Hour 0 is at the top, clockwise.
import { svgDoc, svgText } from '../core/svg.js';
import { viewSettings } from '../config/views.js';
import { estimateWidth, wrapText } from '../core/textfit.js';

const P = viewSettings.time.periodic.p2;
const pad = viewSettings.time.pad;
const small = viewSettings.text.smallFontPx;
const steps = viewSettings.time.periodic.p1.steps;
const pillText = viewSettings.time.periodic.pillText;
const explain = viewSettings.time.periodic.pillExplain;
const HOURS = 24;
const FULL_TURN = 2 * Math.PI;
const TOP = -Math.PI / 2;
const outer = P.diameter / 2;

function pt(c, r, a) {
  return [(c.cx + r * Math.cos(a)).toFixed(2), (c.cy + r * Math.sin(a)).toFixed(2)];
}

function sector(c, r0, r1, a0, a1, cls) {
  const [x1, y1] = pt(c, r1, a0);
  const [x2, y2] = pt(c, r1, a1);
  const [x3, y3] = pt(c, r0, a1);
  const [x4, y4] = pt(c, r0, a0);
  return `<path class="${cls}" d="M ${x1} ${y1} A ${r1} ${r1} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${r0} ${r0} 0 0 0 ${x4} ${y4} Z"/>`;
}

function render(data, opts = {}) {
  const series = data.series;
  const bins = series[0].bins;
  const n = bins.length;
  const variant = opts.variant === 'b' ? 'b' : 'a';
  const low = Boolean(data.diversity && data.diversity.low);
  const shown = variant === 'b' ? Math.min(series.length, P.maxRings) : 1;
  const longest = series.slice(0, shown).reduce((m, s) => (s.label.length > m.length ? s.label : m), '');
  const labelRoom = variant === 'b' ? estimateWidth(longest, small) + P.labelGap : 0;
  // The centre sits one label height in from the top and left, so the hour labels at 0 and 18 stay inside the viewBox.
  const cy = outer + P.tickLength + P.labelGap + small;
  const cx = labelRoom + cy;
  const c = { cx, cy };
  const angleFor = (i) => TOP + i * FULL_TURN / n;
  const body = [];

  if (variant === 'a') {
    for (let i = 0; i < n; i += 1) {
      const v = bins[i];
      if (v > 0) {
        const r1 = P.innerRadius + (outer - P.innerRadius) * (v / data.max);
        body.push(sector(c, P.innerRadius, r1, angleFor(i), angleFor(i) + FULL_TURN / n, 'bar'));
      }
    }
  } else {
    const ringWidth = (outer - P.innerRadius) / shown - P.ringGap;
    for (let k = 0; k < shown; k += 1) {
      const s = series[k];
      const ringTotal = s.bins.reduce((a, b) => a + b, 0);
      const r0 = P.innerRadius + k * (ringWidth + P.ringGap);
      const r1 = r0 + ringWidth;
      for (let i = 0; i < n; i += 1) {
        const v = s.bins[i];
        const cls = v === 0 ? 'na' : 'seq-' + Math.min(steps, Math.max(1, Math.ceil((v / ringTotal) * steps)));
        body.push(sector(c, r0, r1, angleFor(i), angleFor(i) + FULL_TURN / n, cls));
      }
      body.push(svgText(cx - outer - P.labelGap, cy - (r0 + r1) / 2, s.label, 't-muted', 'end', small));
    }
  }

  for (const h of P.hourTicks) {
    const [x, y] = pt(c, outer + P.tickLength + P.labelGap / 2, TOP + h * FULL_TURN / HOURS);
    body.push(svgText(x, y, String(h), 't-muted', 'middle', small));
  }

  body.push(svgText(cx, cy - pad / 2, String(data.total), 't', 'middle', viewSettings.text.fontPx));
  body.push(svgText(cx, cy + pad, 'marks', 't-muted', 'middle', small));

  let height = 2 * cy;
  if (low) {
    const y = 2 * cy + pad;
    const pillW = estimateWidth(pillText, small) + 2 * pad;
    body.push(`<rect class="pill" x="0" y="${y}" width="${pillW}" height="${small + pad}" rx="${small}"/>`);
    body.push(svgText(pad, y + (small + pad) / 2, pillText, 't-muted', 'start', small));
    const lines = wrapText(explain, small, cx + cy);
    lines.forEach((line, i) => {
      body.push(svgText(0, y + small + pad + small / 2 + i * (small + pad / 2), line, 't-muted', 'start', small));
    });
    height = y + small + pad + lines.length * (small + pad / 2) + pad;
  }

  return svgDoc({
    width: Math.ceil(cx + cy),
    height: Math.ceil(height),
    title: '24-hour dial',
    desc: 'marks by hour of day',
    body: body.join(''),
  });
}

export default {
  id: 'P2',
  title: '24-hour dial',
  variants: [{ id: 'a', label: 'Wedges' }, { id: 'b', label: 'Rings' }],
  render,
};
