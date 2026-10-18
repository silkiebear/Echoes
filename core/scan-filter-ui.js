// Label filter controls for the echo scan card (phase 4b, tier 4b.4). Texts and role options come from config. The value is
// read when Run is pressed, so the filter applies on the next run. Only textContent and attributes are set: no markup.
export function filterControls(ui) {
  const node = document.createElement('div');
  node.className = 'scan-filter';
  const text = document.createElement('input');
  text.type = 'text';
  text.autocomplete = 'off';
  text.placeholder = ui.placeholder;
  text.setAttribute('aria-label', ui.label);
  const role = document.createElement('select');
  role.setAttribute('aria-label', ui.roleLabel);
  for (const [value, label] of Object.entries(ui.roles)) {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = label;
    role.append(opt);
  }
  node.append(text, role);
  return { node, read: () => ({ text: text.value, role: role.value }) };
}
