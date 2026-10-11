// Diverging colour bins for rate ratios (blue below 1, orange above 1). Colours are CSS variables
// --div-1 to --div-7 (classes bin-1 to bin-7). Bin 0 is the null/n-a class.
import { viewSettings } from '../config/views.js';
import { formatRatio } from '../core/format.js';
import { svgText } from '../core/svg.js';

const { colorBins, clampLog2, minRr } = viewSettings.diverging;
const { legendBinWidth, legendBarHeight, fontSize } = viewSettings.matrix;

// Bin number (1..colorBins) on log2 scale, clamped; the middle bin is the neutral one.
export function binOf(rr) {
  if (rr === null || rr === undefined) return 0;
  const log = Math.log2(Math.max(rr, minRr));
  const clamped = Math.min(clampLog2, Math.max(-clampLog2, log));
  return 1 + Math.round(((clamped + clampLog2) / (2 * clampLog2)) * (colorBins - 1));
}

// Bar of colour bins at (x, y), with the low and high end values printed under it.
export function legendSvg(x, y) {
  let out = '';
  for (let k = 1; k <= colorBins; k++) {
    out += `<rect class="bin-${k}" x="${x + (k - 1) * legendBinWidth}" y="${y}" width="${legendBinWidth}" height="${legendBarHeight}"/>`;
  }
  const labelY = y + legendBarHeight + fontSize;
  const width = colorBins * legendBinWidth;
  out += svgText(x, labelY, formatRatio(2 ** -clampLog2), 't-muted', 'start');
  out += svgText(x + width, labelY, formatRatio(2 ** clampLog2), 't-muted', 'end');
  return out;
}
