// Colour helpers for the echo view (phase 4g.2). Every tuneable constant is read from app\config\palette.js so no
// bare number lives in a colour module. parseHex/mixHex/contrastRatio/channelSpread are pure: given the same inputs
// they always return the same output, so the selftest can pin exact values.
import { colourMath as M } from '../config/palette.js';

// Every character that may appear in a hex colour pair, upper and lower case, so validation needs no regex.
const HEX = '0123456789abcdefABCDEF';

// Splits a #rrggbb string into three 0..255 integers. Anything that is not exactly # plus six hex digits throws
// TypeError, so callers never have to guard the result.
export function parseHex(hex) {
  if (typeof hex !== 'string' || hex[0] !== '#') {
    throw new TypeError('parseHex: expected a #rrggbb string');
  }
  return [
    parsePair(hex.slice(1, 3)),
    parsePair(hex.slice(3, 5)),
    parsePair(hex.slice(5)),
  ];
}

// One two-character colour pair: both characters must be hex digits, otherwise the whole colour is invalid.
function parsePair(pair) {
  if (pair.length !== 2 || !HEX.includes(pair[0]) || !HEX.includes(pair[1])) {
    throw new TypeError('parseHex: expected six hex digits');
  }
  return parseInt(pair, 16);
}

// Blends two colours by share (0 = bg only, 1 = fg only), rounding each channel to the nearest integer. share is
// checked first so a bad share never reaches parseHex; an invalid colour then throws TypeError.
export function mixHex(bg, fg, share) {
  if (typeof share !== 'number' || !(share >= 0 && share <= 1)) {
    throw new RangeError('mixHex: share must be a number from 0 to 1');
  }
  const bgc = parseHex(bg);
  const fgc = parseHex(fg);
  return '#' + [0, 1, 2].map((i) => {
    const channel = Math.floor(bgc[i] * (1 - share) + fgc[i] * share + M.roundingHalf);
    const hex = channel.toString(16);
    return hex.length < 2 ? '0' + hex : hex;
  }).join('');
}

// Linear-light value for one 0..255 channel, the sRGB compaction step of the WCAG luminance formula.
function linearChannel(value) {
  const x = value / M.channelMax;
  return x <= M.wcag.cut ? x / M.wcag.slope : ((x + M.wcag.offset) / M.wcag.scale) ** M.wcag.gamma;
}

// Relative luminance of a colour: the weighted sum of its three linear channels.
function luminance(hex) {
  const c = parseHex(hex);
  return M.wcag.luma.reduce((sum, weight, i) => sum + weight * linearChannel(c[i]), 0);
}

// WCAG relative contrast between two colours, always at least 1 and symmetric in its arguments.
export function contrastRatio(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  const max = Math.max(la, lb);
  const min = Math.min(la, lb);
  return (max + M.wcag.ratioOffset) / (min + M.wcag.ratioOffset);
}

// How far apart the darkest and lightest channels of a colour are; a proxy for its chroma.
export function channelSpread(hex) {
  const c = parseHex(hex);
  return Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]);
}
