// Combination table model (phase 4h, C2). Pure: buildTableModel(data, texts) returns plain strings and objects only.
// No DOM, no document/window, no store import. The model is what the view renders, so it stays testable in Node.
import { explore } from '../config/explore.js';
import { formatNumber, formatPercent } from '../core/format.js';

export function buildTableModel(data, texts) {
  const ui = explore.ui;
  // Summary: replace each placeholder once. split/join touches one occurrence each.
  const summary = ui.cbSummary
    .split('{all}').join(formatNumber(data.all))
    .split('{none}').join(formatNumber(data.none))
    .split('{some}').join(formatNumber(data.some))
    .split('{n}').join(formatNumber(data.n));

  // Headers: the label texts verbatim (untrusted, never used as object keys), then the two column texts.
  const headers = [...texts, ui.cbDays, ui.cbShare];

  // One row per pattern, in the given order. The key has one character per id in data.ids order.
  const rows = data.patterns.map((pattern) => {
    const key = pattern.key;
    const cells = data.ids.map((id, i) => {
      const present = key[i] === '1';
      return {
        present,
        word: present ? ui.cbPresent : ui.cbAbsent,
        mark: present ? ui.cbPresentMark : ui.cbAbsentMark,
        cls: present ? 'cb-yes' : 'cb-no',
      };
    });
    // Badge only on the row where every selected label is present.
    const badge = key.split('').every((c) => c === '1') ? ui.cbBadge : null;
    return {
      cells,
      days: formatNumber(pattern.count),
      // data.n is 0 only when there are no rows, so this is never called with n = 0.
      share: formatPercent(pattern.count / data.n),
      badge,
    };
  });

  return { summary, headers, rows };
}
