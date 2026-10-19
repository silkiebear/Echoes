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

// Mood score 1 (awful) to 5 (yay!) mapped onto the colour bins. A null score (a day with no mood) is bin 0, the null
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
// { color, name } (a settings scale: the stored colour as a style fill). With maxWidth, an item that would pass it
// starts a new row (4e.0.1), so the key never runs off the view. Without maxWidth the row is one line, as before.
// Returns { svg, width, height }.
export function keyRow(x, y, items, maxWidth = Infinity) {
  const sw = time.moodSwatch;
  const rowStep = sw + time.smallGap;
  let cursor = x;
  let row = 0;
  let right = x;
  let out = '';
  for (const item of items) {
    const textW = estimateWidth(item.name, smallFontPx);
    const itemW = sw + time.smallGap + textW;
    if (cursor > x && cursor + itemW - x > maxWidth) {
      row += 1;
      cursor = x;
    }
    const top = y + row * rowStep;
    const paint = item.color === undefined ? `class="bin-${item.bin}"` : `style="fill: ${scaleColour(item.color)}"`;
    out += `<rect ${paint} x="${cursor}" y="${top}" width="${sw}" height="${sw}"/>`;
    out += svgText(cursor + sw + time.smallGap, top + sw / 2, item.name, 't-muted', 'start', smallFontPx);
    right = Math.max(right, cursor + itemW);
    cursor += itemW + time.moodLegendGap;
  }
  return { svg: out, width: right - x, height: row * rowStep + sw };
}

// Mood key, best first (phase 4e): time.moodNames lists the moods best first, so the name at index i has score n - i.
export function moodLegend(x, y) {
  const n = time.moodNames.length;
  return keyRow(x, y, time.moodNames.map((name, i) => ({ bin: moodBin(n - i), name })));
}

// Mood key from a settings scale, best first (4e.0.1: the scale's order is kept): the name is text, the colour is
// the stored one. maxWidth wraps the key to the next row when it is too wide.
export function scaleLegend(x, y, scale, maxWidth) {
  return keyRow(x, y, scale.map((e) => ({ color: e.color, name: e.name })), maxWidth);
}
