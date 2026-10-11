// View sizes and settings (SPEC 14). Sizes are SVG user units (viewBox). Views read these; none are hardcoded.
export const viewSettings = {
  minWidth: 280,   // CSS px: charts are never narrower; the card scrolls horizontally instead
  format: { ratioDigits: 2, percentDigits: 0 },
  diverging: {
    colorBins: 7,  // CSS variables --div-1 to --div-7; the middle bin is neutral (rate ratio 1)
    clampLog2: 2,  // log2(rate ratio) is clamped to +-2, i.e. rate ratios 0.25 to 4
    minRr: 0.05,   // rate ratios below this use the lowest bin (avoids log2(0))
  },
  zoom: { step: 1.25, min: 1, max: 4 }, // scale factors for the + and - buttons (1 = unzoomed)
  echo: { minExposedDays: 5 },          // demo: fewer exposed days than this gives a null rate ratio
  gallery: { e1Exposure: 'Late coffee F-', e2Exposure: 'Deadline W-', e2Outcome: 'Anxious M-' },
  matrix: {
    maxOutcomes: 8,       // E1 rows in the gallery (labels other than the exposure, in label order)
    cellWidth: 56,
    cellHeight: 34,
    labelWidth: 150,
    headerHeight: 36,
    margin: 8,
    fontSize: 12,
    legendBinWidth: 28,
    legendBarHeight: 10,
    legendHeight: 48,
    dotMaxRadius: 13,     // variant b: dot radius for nExposed >= dotRefN
    dotRefN: 400,
  },
  curve: {
    width: 340,
    height: 220,
    marginLeft: 44,
    marginRight: 12,
    marginTop: 28,
    marginBottom: 36,
    fontSize: 12,
    pointRadius: 3,
    bandOpacity: 0.25,
    days: 14,             // E2 shows lags 1 to days
    bandFraction: 0.25,   // demo band: baseline times (1 - f) to (1 + f); not a placebo band
    yHeadroom: 1.1,       // y axis runs to the largest value times this factor
  },
  ranking: {
    width: 360,
    rowHeight: 60,
    fontSize: 12,
    maxRows: 15,
    pillHeight: 18,
    pillCharWidth: 7,     // rough text width per character, used only to size pills
    pillPadding: 8,
    pillGap: 6,
  },
};
