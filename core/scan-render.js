// DOM for one Echo scan item and the "How to read this" block (phase 4c, 4c.0b; text groups 4e.2). Text only: every
// string, label and pill reaches the page through textContent, so no input string can become markup. Wording comes from
// scan-text.js; the group captions come from config (stats.ui.groups).
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// A text group: a box in the group's kind (what, how, check, numbers, care) with its caption word, always shown, first.
export function groupNode(kind, groups, children) {
  const box = el('div', `grp grp-${kind}`);
  box.append(el('p', 'grp-caption', groups.captions[kind]), ...children);
  return box;
}

function warningsNode(warnings) {
  const box = el('div', 'scan-warnings');
  for (const w of warnings) {
    const item = el('div', 'scan-warning');
    item.append(el('span', 'scan-pill', w.name), el('p', 'scan-warning-text', w.text));
    box.append(item);
  }
  return box;
}

// Item: head, then the groups in order: effect (what), verdict and shift line (check), warnings with their explanation
// (care; a row without warnings has a plain note instead), and the technical line (numbers) only when the toggle is on.
export function itemNode(desc, row, ui, showTechnical) {
  const item = el('div', 'scan-item');
  if (row.longRuns) item.classList.add('scan-item-long');
  item.append(
    el('p', 'scan-item-head', desc.head),
    groupNode('what', ui.groups, [el('p', 'scan-item-effect', desc.effect)]),
  );
  const check = [el('p', `scan-verdict scan-verdict-${desc.verdictKind}`, desc.verdict)];
  if (desc.shift !== null) check.push(el('p', 'scan-item-shift', desc.shift));
  item.append(groupNode('check', ui.groups, check));
  if (desc.warnings.length === 0) item.append(el('p', 'scan-note', ui.plain.noWarnings));
  else item.append(groupNode('care', ui.groups, [warningsNode(desc.warnings)]));
  if (showTechnical) item.append(groupNode('numbers', ui.groups, [el('p', 'scan-item-metrics', desc.technical)]));
  return item;
}

// Closed by default; no script, so the browser's own disclosure handles open and close. Each paragraph is a group of the
// kind config gives it (stats.ui.groups.howToKind).
export function howToNode(ui) {
  const block = el('details', 'scan-help-block');
  block.append(el('summary', 'scan-help-summary', ui.howToTitle));
  ui.howToRead.forEach((text, i) => block.append(groupNode(ui.groups.howToKind[i], ui.groups, [el('p', 'scan-help-text', text)])));
  return block;
}
