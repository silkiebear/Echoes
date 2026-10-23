// C1 Days together (phase 4h, C1): a co-occurrence matrix of the selected labels. Each square is one pair; the
// diagonal is each label on its own days. The shade is the share of the row label's days that also had the column
// label; the number is the days both were present. Label texts are untrusted: they reach the SVG only through svgText,
// which escapes them. Pure: no DOM.
import { svgDoc, svgText } from '../core/svg.js';
import { wrapText, estimateWidth } from '../core/textfit.js';
import { explore } from '../config/explore.js';
import { combos } from '../config/combos.js';
import { coOccurrence } from '../core/cooccurrence.js';

const m = explore.matrix;
const levels = combos.levels;

// The pair with the most days together, as the two ids in that order. Rows of the upper triangle are scanned
// row-major, so a tie keeps the earlier pair. Null when fewer than two labels are selected.
export function pairMost(days, ids) {
  if (ids.length < 2) return null;
  const r = coOccurrence(days, ids);
  let best = -1;
  let pair = null;
  for (let i = 0; i < r.ids.length; i += 1) {
    for (let j = i + 1; j < r.ids.length; j += 1) {
      if (r.both[i][j] > best) {
        best = r.both[i][j];
        pair = [r.ids[i], r.ids[j]];
      }
    }
  }
  return pair;
}

// Level 0..levels-1 from the share of the row label's days that also had the column label. A null row (a label with
// no days) and a 0 share both take the lightest shade.
function levelOf(conditional) {
  if (conditional === null) return 0;
  return Math.min(levels - 1, Math.floor(conditional * levels));
}

function cellRect(x, y, w, h, level, radius) {
  return `<rect class="co-${level}" x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" ry="${radius}"/>`;
}

// One column width for the whole matrix (phase 4h.3c, D19): the widest single word of any header, plus its padding,
// never below cellPx and never above colMaxPx. A word wider than the cap still breaks; the matrix scrolls in its card.
function columnWidth(labels) {
  const words = labels.flatMap((label) => String(label).split(/\s+/).filter(Boolean));
  const widest = Math.max(0, ...words.map((word) => estimateWidth(word, m.fontPx)));
  return Math.min(m.colMaxPx, Math.max(m.cellPx, widest + 2 * m.padPx));
}

// Wrap a label to maxWidth, cut to the line cap.
function wrap(label, maxWidth, cap) {
  const lines = wrapText(label, m.fontPx, maxWidth);
  return lines.length > cap ? lines.slice(0, cap) : lines;
}

// data: the coOccurrence result. opts.texts: the label texts in the same order (the labels are drawn, not the ids).
// opts.width is ignored: the matrix has a fixed size and scrolls inside its card.
export function render(data, opts = {}) {
  const k = data.ids.length;
  const texts = opts.texts || data.ids;
  const fs = m.fontPx;
  const lh = m.lineHeight;
  const colPx = columnWidth(texts);
  const headerLines = texts.map((label) => wrap(label, colPx - 2 * m.padPx, m.headerLines));
  const rowLines = texts.map((label) => wrap(label, m.labelPx - 2 * m.padPx, m.rowLines));
  const headerLineCount = Math.max(1, ...headerLines.map((lines) => lines.length));
  // Header lines are centred like the rows and cells: the first centre sits headerAboveEm below the top edge, and the
  // header ends headerBelowEm below the last centre (explore.matrix, phase 4h.3b).
  const firstCentre = m.headerAboveEm * fs;
  const headerHeight = firstCentre + (headerLineCount - 1) * lh + m.headerBelowEm * fs;
  const x0 = m.labelPx;
  const width = x0 + k * colPx + m.padPx;
  const height = headerHeight + k * m.cellPx + m.padPx;
  let body = '';

  // Column headers, centred over each column.
  headerLines.forEach((lines, j) => {
    const cx = x0 + j * colPx + colPx / 2;
    lines.forEach((line, i) => {
      body += svgText(cx, firstCentre + i * lh, line, 't-muted', 'middle', fs);
    });
  });

  for (let i = 0; i < k; i += 1) {
    const cellTop = headerHeight + i * m.cellPx;
    for (let j = 0; j < k; j += 1) {
      const level = levelOf(data.conditional[i][j]);
      body += cellRect(x0 + j * colPx, cellTop, colPx, m.cellPx, level, m.radiusPx);
      body += svgText(x0 + j * colPx + colPx / 2, cellTop + m.cellPx / 2, String(data.both[i][j]), 'co-num', 'middle', fs);
    }
    const lines = rowLines[i];
    lines.forEach((line, t) => {
      body += svgText(x0 - m.padPx, cellTop + m.cellPx / 2 - ((lines.length - 1) * lh) / 2 + t * lh, line, 't-muted', 'end', fs);
    });
  }

  return svgDoc({
    width,
    height,
    title: 'C1 Days together',
    desc: `Co-occurrence of ${k} labels: the days each pair was present on the same day.`,
    body,
  });
}
