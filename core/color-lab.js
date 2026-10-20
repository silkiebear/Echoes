// CIE Lab colour maths for the series palette distance check (phase 4g.3). Every tuneable constant is read from
// app\config\palette.js so no bare number lives in a colour module. labOf/deltaE76/minPairwiseDeltaE are pure: the
// same input colour always yields the same triple, so the selftest can pin exact values.
import { colourMath } from '../config/palette.js';
import { parseHex } from './color.js';

// The Lab working constants (D65) sit under colourMath.lab; reading them here keeps the formula readable and the
// numbers in one place.
const lab = colourMath.lab;

// Convert one 0..255 channel to its sRGB-linear light value, the compaction step of the Lab pipeline. The sRGB cut
// (colourMath.lab.cut) is the IEC 61966-2-1 value, not the WCAG one used elsewhere.
function linearChannel(channel) {
  const x = channel / colourMath.channelMax;
  return x <= lab.cut ? x / lab.slope : ((x + lab.offset) / lab.scale) ** lab.gamma;
}

// CIE Lab triple for a #rrggbb colour. parseHex throws TypeError on a bad colour, so callers get a clean triple.
export function labOf(hex) {
  const linear = parseHex(hex).map(linearChannel);
  // Scale each linear row by the D65 white point so the values are relative to the reference white.
  const t = lab.rgbToXyz.map((row, i) => {
    let sum = 0;
    for (let j = 0; j < 3; j += 1) sum += row[j] * linear[j];
    return sum / lab.white[i];
  });
  // The Lab f-function is cubic-root above epsilon, linear below it (the kink keeps L finite near black).
  const f = (v) => (v > lab.epsilon ? Math.cbrt(v) : (lab.kappa * v + lab.lOffset) / lab.lScale);
  const fx = f(t[0]);
  const fy = f(t[1]);
  const fz = f(t[2]);
  return [lab.lScale * fy - lab.lOffset, lab.aScale * (fx - fy), lab.bScale * (fy - fz)];
}

// Euclidean distance in Lab between two colours; order does not matter and equal colours give 0.
export function deltaE76(a, b) {
  const la = labOf(a);
  const lb = labOf(b);
  const diff0 = la[0] - lb[0];
  const diff1 = la[1] - lb[1];
  const diff2 = la[2] - lb[2];
  return Math.sqrt(diff0 * diff0 + diff1 * diff1 + diff2 * diff2);
}

// Smallest deltaE76 over every pair (i < j) of the given colours. Fewer than two colours has no pair, so Infinity.
// An invalid colour throws TypeError through labOf.
export function minPairwiseDeltaE(list) {
  if (list.length < 2) return Infinity;
  let min = Infinity;
  for (let i = 0; i < list.length; i += 1) {
    for (let j = i + 1; j < list.length; j += 1) {
      const d = deltaE76(list[i], list[j]);
      if (d < min) min = d;
    }
  }
  return min;
}
