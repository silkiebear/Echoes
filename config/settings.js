// Settings defaults (SPEC 11 and 12). Colours are plain #rrggbb values: the views write them as SVG fill
// attributes, where a CSS variable would not resolve. moodPalette runs from best (index 0) to worst.
export const settingsConfig = {
  version: 1,
  cacheKey: 'echoes.settings.v1',
  settingsFileName: 'echoes-settings.json',
  // The tracker's own groups (phase 4f decision). A code is one category letter; the tracker's two-letter codes are a
  // category plus a subcategory (for example Pa is P with subcategory a), and subcategories are not registered here.
  // Letters K, X, Y, L, Z and U replace the shared G and B letters; B, T and G hold the tracker's former subcategory codes
  // (supplements, complaints, substances), so every category has its own letter.
  categories: [
    { code: 'F', name: 'emotions', color: '#6f8fd6' },
    { code: 'H', name: 'health', color: '#8bbf6a' },
    { code: 'M', name: 'meds', color: '#d6a25b' },
    { code: 'B', name: 'supplements', color: '#7ec8e3' },
    { code: 'P', name: 'pain', color: '#c46a6a' },
    { code: 'T', name: 'complaints', color: '#d9a6e6' },
    { code: 'E', name: 'exercise', color: '#5fb8a6' },
    { code: 'K', name: 'good habits', color: '#8a7fd1' },
    { code: 'X', name: 'bad habits', color: '#d17fb0' },
    { code: 'N', name: 'food', color: '#e8862e' },
    { code: 'G', name: 'substances', color: '#b8d88a' },
    { code: 'Y', name: 'better me', color: '#b5a642' },
    { code: 'W', name: 'productivity', color: '#4fa3c7' },
    { code: 'A', name: 'hobbies', color: '#9aa1b0' },
    { code: 'S', name: 'social', color: '#7fd1c7' },
    { code: 'I', name: 'intimacy', color: '#c9a0dc' },
    { code: 'O', name: 'people', color: '#a3c75a' },
    { code: 'C', name: 'chores', color: '#e07a5f' },
    { code: 'U', name: 'grooming', color: '#3d85c6' },
    { code: 'L', name: 'good stuff', color: '#f2cc8f' },
    { code: 'Z', name: 'bad stuff', color: '#81b29a' },
    { code: 'V', name: 'weather', color: '#b07aa1' },
    { code: 'Q', name: 'sleep quality', color: '#6d9dc5' },
    { code: 'D', name: 'dream content', color: '#d4a373' },
  ],
  // Default mood presets (SPEC 12); order 1 is best. Lightness is spread (WCAG relative luminance about
  // 0.08, 0.20, 0.29, 0.47, 0.58) so the colours differ by lightness as well as hue (SPEC 15).
  moodPresets: [
    { name: 'yay!', order: 1, color: '#1b5e20' },
    { name: 'good', order: 2, color: '#aed581' },
    { name: 'meh', order: 3, color: '#4fc3f7' },
    { name: 'bad', order: 4, color: '#ef6c00' },
    { name: 'awful', order: 5, color: '#e53935' },
  ],
  moodPalette: ['#3f9e6b', '#7cbf5a', '#c9c24a', '#e0953a', '#c4553f', '#8a6fb8', '#5b9bd5'],
  q2: { maxRows: 200 },
  completeness: { minMarksFraction: 0.25 },
};
