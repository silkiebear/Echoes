// Tab map (SPEC 15). Every module id appears in one tab. A module listed nowhere goes to unlistedTab and a WARN is
// logged once. Titles are short so that four fit at 320 px.
export const tabs = [
  { id: 'data', title: 'Data', modules: ['data-load', 'mood-setup', 'q1-coverage', 'q2-label-coding'] },
  { id: 'scan', title: 'Scan', modules: ['echo-scan'] },
  { id: 'gallery', title: 'Gallery', modules: ['gallery', 'gallery-time', 'gallery-periodic'] },
  { id: 'tools', title: 'Tools', modules: ['status', 'selftest-panel', 'diag-panel', 'privacy-probe'] },
];

export const tabSettings = {
  defaultTab: 'data',
  storageKey: 'echoes.tab',
  unlistedTab: 'tools',
  ui: {
    label: 'Sections',
    warning: 'Some modules are not in the tab map. They are shown under Tools.',
  },
};
