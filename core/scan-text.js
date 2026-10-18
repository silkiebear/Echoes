// Plain-language text for Echo scan rows and the plain summary (phase 4c, 4c.0b). Pure: no DOM, no logging.
// Every wording comes from config (stats.ui); this file only fills placeholders, in one pass, so label text inserted
// for one placeholder is never read as another. The verdict is a wording of existing fields (q below alpha, flags),
// not a new statistical claim: "passed the check" does not mean "real".
import { flags } from '../config/flags.js';
import { formatNumber, formatRatio } from './format.js';

const labelTexts = new WeakMap();

function textOf(labels, id) {
  if (!labelTexts.has(labels)) labelTexts.set(labels, new Map(labels.map((l) => [l.id, l.text])));
  return labelTexts.get(labels).get(id);
}

function fill(template, values) {
  return template.replace(/\{(\w+)\}/g, (match, key) => (Object.hasOwn(values, key) ? String(values[key]) : match));
}

const isNum = (x) => typeof x === 'number' && Number.isFinite(x);

function percent(fraction, digits, plain) {
  return `${formatNumber(fraction * plain.percentScale, digits)}%`;
}

// Small p and q values keep their scale (5e-44 must not print as 0).
function pValue(p, ui) {
  return p < ui.pSciBelow ? p.toExponential(ui.pDigits) : formatNumber(p, ui.pDigits);
}

// A row is "fail" unless q is a number below alpha; then "pass" when no flag other than failsFdr is true and no
// long-run label marks it, otherwise "pass-warnings". failsFdr is left out because the verdict already states it.
export function verdictKind(row, cfg) {
  if (!isNum(row.q) || row.q >= cfg.alpha) return 'fail';
  const warned = row.longRuns === true || flags.some((f) => f.id !== 'failsFdr' && row.flags[f.id] === true);
  return warned ? 'pass-warnings' : 'pass';
}

// One warning per true flag (config order), then longRuns. Null and false give nothing; failsFdr is not repeated.
function warningsOf(row, ui) {
  const ids = flags.map((f) => f.id).filter((id) => id !== 'failsFdr' && row.flags[id] === true);
  if (row.longRuns === true) ids.push('longRuns');
  return ids.map((id) => ({
    id,
    name: id === 'longRuns' ? ui.longRunPill : (ui.pillNames[id] || id),
    text: ui.flagExplain[id] || id,
  }));
}

function ratioSentence(rr, cfg) {
  const plain = cfg.ui.plain;
  if (!isNum(rr)) return plain.noRatio;
  if (Math.abs(rr - cfg.direction.unity) <= plain.usualBand) return plain.ratioUsual;
  const template = rr < cfg.direction.unity ? plain.ratioLess : plain.ratio;
  return fill(template, { ratio: formatNumber(rr, plain.timesDigits) });
}

function effectOf(row, exposure, outcome, phrase, cfg) {
  const plain = cfg.ui.plain;
  const first = isNum(row.n) && isNum(row.rate)
    ? fill(plain.effect, {
      days: formatNumber(row.n),
      exposure,
      outcome,
      window: phrase,
      rate: percent(row.rate, plain.percentDigits, plain),
    })
    : plain.noRate;
  const second = isNum(row.base) ? fill(plain.usual, { base: percent(row.base, plain.percentDigits, plain) }) : plain.noBase;
  return [first, second, ratioSentence(row.rrAdj, cfg)].join(' ');
}

function verdictText(kind, meta, cfg) {
  const v = cfg.ui.plain.verdict;
  if (kind === 'pass') return fill(v.pass, { falseShare: formatNumber(cfg.alpha * cfg.ui.plain.percentScale) });
  if (kind === 'pass-warnings') return v.passWarnings;
  return fill(v.fail, { family: formatNumber(meta.family) });
}

function technicalOf(row, cfg) {
  const ui = cfg.ui;
  const t = ui.technical;
  return fill(t.line, {
    rr: isNum(row.rrAdj) ? formatRatio(row.rrAdj) : ui.na,
    diff: isNum(row.diff) ? formatNumber(row.diff * ui.plain.percentScale, ui.plain.diffDigits) : ui.na,
    n: formatNumber(row.n),
    q: isNum(row.q) ? pValue(row.q, ui) : t.notKept,
    topK: formatNumber(cfg.placebo.topK),
    placebo: isNum(row.placeboP) ? pValue(row.placeboP, ui) : t.notRun,
  });
}

// describeRow(row, labels, windows, meta, cfg, rank?) -> { head, effect, verdict, verdictKind, shift, warnings, technical }
// rank is the 1-based position on the card; without it the head has no rank. Unknown ids get config fallbacks.
export function describeRow(row, labels, windows, meta, cfg, rank = null) {
  const ui = cfg.ui;
  const exposure = textOf(labels, row.exposure) ?? ui.plain.unknownLabel;
  const outcome = textOf(labels, row.outcome) ?? ui.plain.unknownLabel;
  const win = windows.find((w) => w.id === row.window);
  const phrase = win && Object.hasOwn(ui.windowPhrases, win.id) ? ui.windowPhrases[win.id] : ui.plain.unknownWindow;
  const kind = verdictKind(row, cfg);
  const rankText = rank === null ? '' : `${ui.rankPrefix}${rank} `;
  return {
    head: `${rankText}${exposure}${ui.arrow}${outcome} (${phrase})`,
    effect: effectOf(row, exposure, outcome, phrase, cfg),
    verdict: verdictText(kind, meta, cfg),
    verdictKind: kind,
    shift: isNum(row.placeboP) ? fill(ui.plain.shift, { exposure, share: percent(row.placeboP, ui.plain.shiftDigits, ui.plain) }) : null,
    warnings: warningsOf(row, ui),
    technical: technicalOf(row, cfg),
  };
}

// The plain summary above the rows: one sentence per entry, counts only, no statistics terms.
export function plainSummary(meta, windows, cfg) {
  const s = cfg.ui.plainSummary;
  const lines = [fill(s.checked, { cells: formatNumber(meta.cellsTested) })];
  if (meta.discoveries === 0) {
    lines.push(s.none);
  } else {
    const withLong = meta.discoveriesLongRuns;
    lines.push(fill(s.passed, {
      discoveries: formatNumber(meta.discoveries),
      without: formatNumber(meta.discoveries - withLong),
      withLong: formatNumber(withLong),
    }));
    lines.push(fill(s.direction, {
      discoveries: formatNumber(meta.discoveries),
      up: formatNumber(meta.up),
      down: formatNumber(meta.down),
    }));
    if (meta.noDirection > 0) lines.push(fill(s.noDirection, { count: formatNumber(meta.noDirection) }));
    const parts = [];
    windows.forEach((w, i) => {
      const count = meta.byWindow[i];
      if (count > 0) parts.push(`${cfg.ui.windowShort[w.id] ?? w.id}: ${formatNumber(count)}`);
    });
    if (parts.length) lines.push(fill(s.byWindow, { list: parts.join(', ') }));
  }
  lines.push(s.caution);
  return lines;
}
