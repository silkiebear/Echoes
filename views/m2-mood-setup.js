// M2 Mood setup preview. One row per mood in best-to-worst order, with a colour swatch.
import { svgDoc, svgText } from '../core/svg.js';
import { wrapText, estimateWidth } from '../core/textfit.js';
import { viewSettings } from '../config/views.js';

const P = viewSettings.m2;
const F = viewSettings.text.fontPx;
const HEX = /^#[0-9a-f]{6}$/i;
const CORNER = 8; // row band corner radius
const SWATCH_CORNER = 4; // swatch corner radius

function render(data, opts = {}) {
  // Copy before sorting so the caller's array is never mutated.
  const moods = [...data.moods].sort((a, b) => a.order - b.order);
  const pad = P.pad;
  const textLeft = pad + P.orderWidth + P.swatch + pad;

  const words = [];
  for (const mood of moods) {
    for (const w of mood.name.split(/\s+/).filter(Boolean)) words.push(w);
  }
  const widest = words.reduce((max, w) => Math.max(max, estimateWidth(w, F)), 0);
  const width = Math.max(opts.width || viewSettings.defaultWidth, textLeft + widest + pad, P.minWidth);
  const maxTextWidth = width - textLeft - pad;

  if (moods.length === 0) {
    const height = F * P.lineHeight + 2 * pad;
    const body = svgText(pad, pad + F / 2, 'No moods yet', 't-muted', 'start');
    return svgDoc({ width, height, title: 'M2 Mood setup', desc: 'Moods in order from best to worst, with their colours', body });
  }

  const lineH = F * P.lineHeight;
  let top = 0;
  const rows = moods.map((mood) => {
    // An empty name renders as a single blank line so the row still has height.
    const lines = mood.name.length === 0 ? [''] : wrapText(mood.name, F, maxTextWidth);
    const h = Math.max(P.rowHeight, lines.length * lineH + 2 * pad);
    const row = { mood, lines, h, top };
    top += h;
    return row;
  });

  let body = '';
  for (const { mood, lines, h, top } of rows) {
    const y0 = top;
    const block = lines.length * lineH;
    const blockTop = y0 + (h - block) / 2;
    // Only a stored #rrggbb colour is written; anything else falls back to config.
    const colour = HEX.test(mood.color) ? mood.color : P.fallbackColor;
    body += `<rect class="m2-row-bg" x="0" y="${y0 + 1}" width="${width}" height="${h - 2}" rx="${CORNER}"/>`;
    body += svgText(pad + P.orderWidth / 2, y0 + h / 2, String(mood.order), 't-muted', 'middle');
    // views.css sets fill on every svg rect, which overrides the fill attribute; the style attribute wins over it.
    body += `<rect class="m2-swatch" x="${pad + P.orderWidth}" y="${y0 + (h - P.swatch) / 2}" width="${P.swatch}" height="${P.swatch}" rx="${SWATCH_CORNER}" fill="${colour}" style="fill: ${colour}"/>`;
    for (let j = 0; j < lines.length; j += 1) {
      body += svgText(textLeft, blockTop + lineH * (j + 0.5), lines[j], 't', 'start');
    }
  }

  return svgDoc({ width, height: top, title: 'M2 Mood setup', desc: 'Moods in order from best to worst, with their colours', body });
}

export default { id: 'M2', title: 'Mood setup', variants: [], render };
