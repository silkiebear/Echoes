// Mood and this label, model (phase 4h, M1). Pure: buildMoodModel(result, labelText) returns plain strings and objects.
// No DOM, no document/window, no store. The model is what the view renders, so it stays testable in Node.
import { explore } from '../config/explore.js';
import { moodInfluenceConfig } from '../config/mood-influence.js';
import { formatNumber, formatPercent } from '../core/format.js';

// Replace each {key} in a template once by the value of key in values, one pass over the template only.
function fill(template, values) {
  return template.replace(/\{(\w+)\}/g, (_, k) => values[k]);
}

// The technical line is the same for every result, so it is built once from config.
function numbersLine() {
  return fill(explore.ui.miNumbers, {
    seed: String(moodInfluenceConfig.seed),
    resamples: formatNumber(moodInfluenceConfig.resamples),
    blockLength: String(moodInfluenceConfig.blockLength),
  });
}

export function buildMoodModel(result, labelText) {
  const ui = explore.ui;
  const status = result.status;
  const d = explore.mood.digits;
  // Counts are whole days; mood numbers use the mood digits.
  const n1 = formatNumber(result.n1);
  const n0 = formatNumber(result.n0);
  const mean1 = formatNumber(result.mean1, d);
  const mean0 = formatNumber(result.mean0, d);
  const diff = formatNumber(result.diff, d);
  const lo = formatNumber(result.lo, d);
  const hi = formatNumber(result.hi, d);
  const level = formatPercent(result.level);

  if (status === 'too-few-days') {
    return { status, sentence: fill(ui.miTooFew, { min: formatNumber(moodInfluenceConfig.minPerGroup) }), table: null, numbersLine: numbersLine() };
  }
  if (status === 'too-many-skipped') {
    return { status, sentence: ui.miTooSkipped, table: null, numbersLine: numbersLine() };
  }
  if (status !== 'ok') {
    return { status, sentence: '', table: null, numbersLine: numbersLine() };
  }

  return {
    status,
    sentence: fill(ui.miOk, { label: labelText, mean1, mean0, diff, lo, hi }),
    table: {
      headers: [ui.miColGroup, ui.miColValue],
      rows: [
        [fill(ui.miRowWith, { label: labelText, n: n1 }), mean1],
        [fill(ui.miRowWithout, { label: labelText, n: n0 }), mean0],
        [ui.miRowDiff, diff],
        [fill(ui.miRowRange, { level }), fill(ui.miRangeText, { lo, hi })],
      ],
    },
    numbersLine: numbersLine(),
  };
}
