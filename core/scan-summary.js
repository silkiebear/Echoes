// Technical summary of an Echo scan (shown with "Show technical numbers"): every number with its name (phase 4c, 4c.0b;
// the strata and day-volume counts are phase 4d, 4d.3). Pure: the config texts come in as `ui`, and only numbers and
// config words are filled in, never label text.
import { formatNumber } from './format.js';

// Fills "{name}" placeholders of a config text.
function fillOf(template, values) {
  return Object.entries(values).reduce((text, [key, value]) => text.replace(`{${key}}`, String(value)), template);
}

// Counts only: the strata rule the scan used, and the spread of distinct labels per observed day.
function volumeTexts(meta, ui) {
  if (!meta.strata) return [];
  const t = ui.technical;
  const out = [fillOf(t.rule[meta.strata.mode], { days: meta.strata.days, bands: meta.strata.bands })];
  if (meta.dayVolume) {
    const v = meta.dayVolume;
    out.push(fillOf(t.volumeLine, {
      min: formatNumber(v.min), p10: formatNumber(v.p10), median: formatNumber(v.median), p90: formatNumber(v.p90), max: formatNumber(v.max),
    }));
  }
  return out;
}

export function summaryText(meta, ui) {
  const s = ui.summary;
  const discoveries = `${s.discoveries}: ${formatNumber(meta.discoveries)} `
    + `(${s.longRuns}: ${formatNumber(meta.discoveriesLongRuns)}, ${s.withoutLongRuns}: ${formatNumber(meta.discoveries - meta.discoveriesLongRuns)})`;
  return [
    `${s.cells}: ${formatNumber(meta.cellsTested)}`,
    `${s.family}: ${formatNumber(meta.family)} ${s.familyUnit}`,
    discoveries,
    `${formatNumber(meta.ms)} ${s.ms}`,
    `${s.runner}: ${meta.runner}`,
    ui.technical.summaryUntested.replace('{count}', formatNumber(meta.untested)),
    ...volumeTexts(meta, ui),
  ].join(ui.sep);
}
