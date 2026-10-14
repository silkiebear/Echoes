// Text-fit estimates for generated SVG text. There are no font metrics here: width = characters x font size
// x charWidthEm (config/views.js). The layout test uses these boxes to catch gross overflow and overlap; it is
// not a pixel check, and real glyph widths differ.
import { viewSettings } from '../config/views.js';

const { charWidthEm, tolerance } = viewSettings.text;

export function estimateWidth(text, fontPx) {
  return String(text).length * fontPx * charWidthEm;
}

// svgText centres the text on y (dy 0.35em), so the box runs half a font size above and below y.
export function textBox(x, y, text, fontPx, anchor = 'start') {
  const w = estimateWidth(text, fontPx);
  const x0 = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;
  return { x0, y0: y - fontPx / 2, x1: x0 + w, y1: y + fontPx / 2 };
}

// Greedy word wrap by estimated width. A single word longer than maxWidth stays on its own line.
export function wrapText(text, fontPx, maxWidth) {
  const lines = [];
  let line = '';
  for (const word of String(text).split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (line && estimateWidth(next, fontPx) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Boxes count as overlapping only when they intersect by more than the tolerance.
export function overlaps(a, b) {
  return a.x0 < b.x1 - tolerance && b.x0 < a.x1 - tolerance
    && a.y0 < b.y1 - tolerance && b.y0 < a.y1 - tolerance;
}

export function insideView(box, width, height) {
  return box.x0 >= -tolerance && box.y0 >= -tolerance
    && box.x1 <= width + tolerance && box.y1 <= height + tolerance;
}
