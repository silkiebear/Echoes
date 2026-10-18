// DOM for one Echo scan item and the "How to read this" block (phase 4c, 4c.0b). Text only: every string, label and
// pill reaches the page through textContent, so no input string can become markup. Wording comes from scan-text.js.
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// Item: head, plain effect, verdict (outline style by kind), shift line, warnings with their explanation, and the
// technical line only when the toggle is on.
export function itemNode(desc, row, ui, showTechnical) {
  const item = el('div', 'scan-item');
  if (row.longRuns) item.classList.add('scan-item-long');
  const warnings = el('div', 'scan-warnings');
  if (desc.warnings.length === 0) warnings.append(el('p', 'scan-note', ui.plain.noWarnings));
  for (const w of desc.warnings) {
    const box = el('div', 'scan-warning');
    box.append(el('span', 'scan-pill', w.name), el('p', 'scan-warning-text', w.text));
    warnings.append(box);
  }
  item.append(
    el('p', 'scan-item-head', desc.head),
    el('p', 'scan-item-effect', desc.effect),
    el('p', `scan-verdict scan-verdict-${desc.verdictKind}`, desc.verdict),
  );
  if (desc.shift !== null) item.append(el('p', 'scan-item-shift', desc.shift));
  item.append(warnings);
  if (showTechnical) item.append(el('p', 'scan-item-metrics', desc.technical));
  return item;
}

// Closed by default; no script, so the browser's own disclosure handles open and close.
export function howToNode(ui) {
  const block = el('details', 'scan-help-block');
  block.append(el('summary', 'scan-help-summary', ui.howToTitle));
  for (const text of ui.howToRead) block.append(el('p', 'scan-help-text', text));
  return block;
}
