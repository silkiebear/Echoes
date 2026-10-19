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

// Pieces of one word that each fit maxWidth. A character is never split from its word except here, where a word is
// wider than the line (phase 4e: an unbroken label must not run off its view).
function piecesOf(word, fontPx, maxWidth) {
  const out = [];
  let piece = '';
  for (const ch of word) {
    if (piece && estimateWidth(piece + ch, fontPx) > maxWidth) {
      out.push(piece);
      piece = ch;
    } else {
      piece += ch;
    }
  }
  if (piece) out.push(piece);
  return out;
}

// Greedy word wrap by estimated width. A word that fits its line is kept whole; a word wider than maxWidth is cut into
// pieces that fit, and a cut piece continues on the next line without a space.
export function wrapText(text, fontPx, maxWidth) {
  const tokens = [];
  for (const word of String(text).split(/\s+/).filter(Boolean)) {
    const pieces = estimateWidth(word, fontPx) > maxWidth ? piecesOf(word, fontPx, maxWidth) : [word];
    pieces.forEach((piece, i) => tokens.push({ text: piece, space: i === 0 && tokens.length > 0 }));
  }
  const lines = [];
  let line = '';
  for (const token of tokens) {
    const next = line && token.space ? `${line} ${token.text}` : `${line}${token.text}`;
    if (line && estimateWidth(next, fontPx) > maxWidth) {
      lines.push(line);
      line = token.text;
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
