// View sizes and settings (SPEC 14). Sizes are SVG user units (viewBox) unless marked CSS px.
// Views read these; none are hardcoded. Text boxes are estimates (core/textfit.js), not font metrics.
export const viewSettings = {
  minWidth: 280,        // CSS px: charts are never narrower; the card scrolls horizontally instead
  defaultWidth: 360,    // CSS px used when a card has no measured width yet
  format: { ratioDigits: 2, percentDigits: 0 },
  text: {
    fontPx: 12,         // regular chart text (svgText writes this as font-size)
    smallFontPx: 11,    // axis labels, captions, weekday and month names
    charWidth: 0.6,     // estimated advance per character, in em (start value; only the layout test uses it)
    tolerance: 1,       // text boxes may touch or overlap by this many units
    outlinePad: 4,      // text must stay at least this far inside or outside a dashed outline
  },
  diverging: {
    colorBins: 7,       // CSS variables --div-1 to --div-7; the middle bin is neutral (rate ratio 1)
    clampLog2: 2,       // log2(rate ratio) is clamped to +-2, i.e. rate ratios 0.25 to 4
    minRr: 0.05,        // rate ratios below this use the lowest bin (avoids log2(0))
  },
  zoom: { step: 1.25, min: 1, max: 4 }, // scale factors for + and - and pinch (1 = unzoomed)
  echo: { minExposedDays: 5 },          // demo: fewer exposed days than this gives a null rate ratio
  gallery: { e1Exposure: 'Late coffee F-', e2Exposure: 'Deadline W-', e2Outcome: 'Anxious M-' },
  matrix: {
    maxOutcomes: 8,       // E1 rows in the gallery (labels other than the exposure, in label order)
    cellWidth: 56,
    cellHeight: 34,
    labelWidth: 150,      // room for outcome labels left of the grid
    headerHeight: 48,     // column header band above the first row
    headerGap: 14,        // header text centre sits this far above the first row
    labelGap: 4,          // outcome labels end this far left of the grid
    margin: 8,
    captionGap: 8,        // caption centre to legend swatches
    legendBinWidth: 28,
    legendBarHeight: 10,
    legendLabelGap: 4,    // legend end values sit this far below the swatches
    legendHeight: 48,     // caption row, swatches and end values
    dotMaxRadius: 13,     // variant b: dot radius for nExposed >= dotRefN
    dotRefN: 400,
  },
  curve: {
    width: 360,           // default SVG width (CSS px) when no width is given
    minPlotWidth: 240,    // the plot never gets narrower than this
    marginLeft: 44,
    marginRight: 12,
    marginTop: 28,
    plotHeight: 148,
    yLabelGap: 4,         // y axis labels end this far left of the axis
    tickLength: 4,        // x axis tick marks at the days in tickDays
    tickDays: [1, 7, 14],
    xLabelGap: 2,         // x tick labels sit this far below the tick marks
    captionGap: 8,        // caption starts this far below the x tick labels
    captionLineHeight: 14,
    pad: 8,               // bottom and side padding for the caption
    pointRadius: 3,
    bandOpacity: 0.25,
    days: 14,             // E2 shows lags 1 to days
    bandFraction: 0.25,   // demo band: baseline times (1 - f) to (1 + f); not a placebo band
    yHeadroom: 1.1,       // y axis runs to the largest value times this factor
  },
  ranking: {
    rowHeight: 72,
    rowInset: 2,          // row background and dashed outline sit this far inside the row
    rowRadius: 8,
    pad: 8,               // left inset for text and right inset after the widest line
    titleY: 16,           // row-relative centres of the three lines
    metaY: 34,
    pillTop: 46,
    pillHeight: 18,
    pillPadding: 8,
    pillGap: 6,
    maxRows: 15,
  },
  time: {
    pad: 8,
    smallGap: 4,
    moodNames: ['bad', 'low', 'okay', 'good', 'great'], // mood score 1 to 5
    moodBins: [1, 2, 4, 6, 7],   // mood score 1 to 5 -> colour bin 1 to 7 (5 steps spread over --div-1..7)
    moodSwatch: 10,
    moodLegendGap: 10,           // space between legend items
    defaultYearLabel: 'Calm M+',
    yearGrid: {
      cellMin: 5,        // smallest week cell before the grid scrolls inside its card
      monthCellMin: 10,  // month rows need at least a small font plus a gap, so this is larger
      cellMax: 14,
      gap: 2,
      gutter: 30,        // room for weekday or month names on the left
      topBand: 16,       // room for month names (a) or day numbers (b) above the grid
      weekdayRows: [1, 3, 5],
      dayLabels: [1, 10, 20, 31],
    },
    lanes: {
      labels: ['Late coffee F-', 'Poor sleep S-', 'Alcohol H-', 'Headache B-', 'Long walk A+', 'Calm M+'],
      ranges: [
        { id: '3m', label: '3 months', days: 92 },
        { id: '1y', label: '1 year', days: 365 },
        { id: 'all', label: 'All', days: 0 },
      ],
      defaultRange: '1y',
      rowHeight: 16,
      rowGap: 6,
      tickHeight: 12,
      tickMinWidth: 2,
      moodBandHeight: 14,
      minPlotWidth: 200,
      axisGap: 6,
    },
    strip: {
      labels: ['Calm M+', 'Deadline W-', 'Anxious M-', 'Poor sleep S-'],
      bins: 12,              // calendar months shown
      barPitch: 10,
      barWidth: 8,
      barMaxHeight: 26,      // bar height at density 1 (every day has the label)
      rowHeight: 48,
      countGap: 6,
      triHalf: 5,            // change triangle half-width
      triHeight: 8,          // change triangle height
      trendFlatSlope: 0.5,   // least-squares slope (count per month) below this is "flat"
    },
    rolling: {
      labels: ['Poor sleep S-', 'Calm M+', 'Anxious M-'],
      windows: [30, 90],     // trailing window in days
      defaultWindow: 30,
      seriesBins: [1, 6, 3], // colour bins for the three lines
      swatch: 10,
      legendRowHeight: 16,
      legendGap: 8,
      marginLeft: 40,
      marginRight: 8,
      plotHeight: 150,
      minPlotWidth: 200,
      yHeadroom: 1.1,
      minYMax: 0.1,          // y axis never shorter than this rate
    },
  },
};
