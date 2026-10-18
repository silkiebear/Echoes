// Tab map (SPEC 15). Every module id appears in one tab. A module listed nowhere goes to unlistedTab and a WARN is
// logged once. Titles are short so that four fit at 320 px. Modules in a tab show in their `order` field order.
// Phase 4c: Mood order moved to Tools; Echo scan moved to the bottom of Data; the Scan tab is replaced by Explore
// (label selection and the T views on your data, 4c.2).
export const tabs = [
  { id: 'data', title: 'Data', modules: ['data-load', 'q1-coverage', 'q2-label-coding', 'echo-scan'] },
  { id: 'explore', title: 'Explore', modules: ['explore-select', 'explore-time', 'explore-periodic', 'explore-echo'] },
  { id: 'gallery', title: 'Gallery', modules: ['gallery', 'gallery-time', 'gallery-periodic'] },
  { id: 'tools', title: 'Tools', modules: ['status', 'mood-setup', 'selftest-panel', 'diag-panel', 'diag-check', 'privacy-probe'] },
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
