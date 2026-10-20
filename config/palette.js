// Colour maths constants (phase 4g.2). The sRGB and WCAG 2.x constants are the published standard values; the
// hand cases in the colour tests check them. Kept here so no colour module carries a bare number.
export const colourMath = {
  channelMax: 255,
  roundingHalf: 0.5,
  wcag: {
    cut: 0.03928,
    slope: 12.92,
    offset: 0.055,
    scale: 1.055,
    gamma: 2.4,
    luma: [0.2126, 0.7152, 0.0722],
    ratioOffset: 0.05,
  },
  // CIE Lab (D65) constants for the series palette distance check (phase 4g.3). The sRGB cut is 0.04045
  // (IEC 61966-2-1), not the WCAG 0.03928 above; the two differ only for channels below 0.041.
  lab: {
    cut: 0.04045,
    slope: 12.92,
    offset: 0.055,
    scale: 1.055,
    gamma: 2.4,
    rgbToXyz: [
      [0.4124564, 0.3575761, 0.1804375],
      [0.2126729, 0.7151522, 0.0721750],
      [0.0193339, 0.1191920, 0.9503041],
    ],
    white: [0.95047, 1, 1.08883],
    epsilon: 0.008856,
    kappa: 903.3,
    lScale: 116,
    lOffset: 16,
    aScale: 500,
    bScale: 200,
  },
};

// Dark group tint = mixHex(card surface, group accent, darkTintMix). Tint must sit just above the surface
// (ratio range) and stay low-chroma (spread cap) so the dark groups do not pull attention from the text.
export const palette = { darkTintMix: 0.1, tintOnSurface: { min: 1.1, max: 1.25 }, tintSpreadMax: 14 };

// T4 series palette (phase 4g.3): one colour, one marker and one class pair per series, eight per theme. The
// colours are the --series-N values of tokens.css; the marker order is the order of the series. Each colour keeps
// the minimum CIE76 distance (seriesMinDeltaE) from every other colour of its theme and the minimum contrast
// (seriesMinContrast) against the card surface.
export const seriesPalette = {
  count: 8,
  seriesMinDeltaE: 25,
  seriesMinContrast: 3,
  dark: ['#209bf6', '#e5c45f', '#eb6b98', '#2ddfb3', '#5bbed3', '#df7b4e', '#6da449', '#d6bcf1'],
  light: ['#9d3723', '#176dc7', '#437a20', '#84693b', '#7f3f92', '#116550', '#86455a', '#057698'],
  markers: ['circle', 'square', 'triangle-up', 'diamond', 'triangle-down', 'plus', 'cross', 'ring'],
  markerRadius: 4,      // CSS px from the centre to the edge of a marker (legend and plot)
  markerStroke: 1.5,    // stroke width of the open markers (plus, cross, ring), CSS px
};
