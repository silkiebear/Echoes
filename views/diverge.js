// Colour bins and legends. Colours are CSS variables --div-1 to --div-7 (classes bin-1 to bin-7). Bin 0 is the
// null/n-a class. Every view takes its colour from here, so the scale is defined in one place.
import { viewSettings } from '../config/views.js';
import { explore } from '../config/explore.js';
import { formatRatio } from '../core/format.js';
import { svgText } from '../core/svg.js';
import { estimateWidth } from '../core/textfit.js';
import { isHexColour } from '../core/view-data.js';

const { colorBins, clampLog2, minRr } = viewSettings.diverging;
const { legendBinWidth, legendBarHeight, legendLabelGap } = viewSettings.matrix;
const { fontPx, smallFontPx } = viewSettings.text;
const time = viewSettings.time;

// Bin number (1..colorBins) on log2 scale, clamped; the middle bin is the neutral one.
export function binOf(rr) {
  if (rr === null || rr === undefined) return 0;
  const log = Math.log2(Math.max(rr, minRr));
  const clamped = Math.min(clampLog2, Math.max(-clampLog2, log));
  return 1 + Math.round(((clamped + clampLog2) / (2 * clampLog2)) * (colorBins - 1));
}

// Mood score 1 (bad) to 5 (great) mapped onto the colour bins. A null score (a day with no mood) is bin 0, the null
// class; it must not read as the worst mood (phase 4c, 4c.2, user decision A).
export function moodBin(score) {
  if (score === null || score === undefined) return 0;
  const index = Math.min(time.moodBins.length, Math.max(1, Math.round(score))) - 1;
  return time.moodBins[index];
}

// Presence: the strongest bin when the label is on that day, the lowest when it is not.
export function presenceBin(present) {
  return present ? colorBins : 1;
}

// Bar of colour bins at (x, y), with the low and high end values printed under it.
export function legendSvg(x, y) {
  let out = '';
  for (let k = 1; k <= colorBins; k++) {
    out += `<rect class="bin-${k}" x="${x + (k - 1) * legendBinWidth}" y="${y}" width="${legendBinWidth}" height="${legendBarHeight}"/>`;
  }
  const labelY = y + legendBarHeight + legendLabelGap + fontPx / 2;
  const width = colorBins * legendBinWidth;
  out += svgText(x, labelY, formatRatio(2 ** -clampLog2), 't-muted', 'start');
  out += svgText(x + width, labelY, formatRatio(2 ** clampLog2), 't-muted', 'end');
  return out;
}

// A mood colour from the settings, checked before it reaches the markup (4d.0.2).
export function scaleColour(color) {
  return isHexColour(color) ? color : explore.mood.fallbackColor;
}

// Fill of a mood score under a settings scale (core/view-data.js moodScale). A score with no entry gets the fallback.
export function scaleFill(score, scale) {
  const entry = scale.find((e) => e.score === score);
  return entry ? scaleColour(entry.color) : explore.mood.fallbackColor;
}

// Key row: one swatch and name per item, left to right. An item is { bin, name } (the demo scale, classes bin-N) or
// { color, name } (a settings scale: the stored colour as a style fill). Returns { svg, width }.
export function keyRow(x, y, items) {
  const sw = time.moodSwatch;
  let cursor = x;
  let out = '';
  for (const item of items) {
    const paint = item.color === undefined ? `class="bin-${item.bin}"` : `style="fill: ${scaleColour(item.color)}"`;
    out += `<rect ${paint} x="${cursor}" y="${y}" width="${sw}" height="${sw}"/>`;
    out += svgText(cursor + sw + time.smallGap, y + sw / 2, item.name, 't-muted', 'start', smallFontPx);
    cursor += sw + time.smallGap + estimateWidth(item.name, smallFontPx) + time.moodLegendGap;
  }
  return { svg: out, width: cursor - x - time.moodLegendGap };
}

// Mood key from bad (score 1) to great (score 5).
export function moodLegend(x, y) {
  return keyRow(x, y, time.moodNames.map((name, i) => ({ bin: moodBin(i + 1), name })));
}

// Mood key from a settings scale (worst to best): the name is text, the colour is the stored one.
export function scaleLegend(x, y, scale) {
  return keyRow(x, y, scale.map((e) => ({ color: e.color, name: e.name })));
}
