// Settings defaults (SPEC 11 and 12). Colours are plain #rrggbb values: the views write them as SVG fill
// attributes, where a CSS variable would not resolve. moodPalette runs from best (index 0) to worst.
export const settingsConfig = {
  version: 1,
  cacheKey: 'echoes.settings.v1',
  settingsFileName: 'echoes-settings.json',
  categories: [
    { code: 'S', name: 'sleep', color: '#6f8fd6' },
    { code: 'F', name: 'food', color: '#8bbf6a' },
    { code: 'B', name: 'body and health', color: '#d6a25b' },
    { code: 'H', name: 'habits and substances', color: '#c46a6a' },
    { code: 'A', name: 'activity and outdoors', color: '#5fb8a6' },
    { code: 'W', name: 'work and study', color: '#8a7fd1' },
    { code: 'P', name: 'people', color: '#d17fb0' },
    { code: 'E', name: 'events and incidents', color: '#e8862e' },
    { code: 'T', name: 'triggers', color: '#b5a642' },
    { code: 'D', name: 'dreams', color: '#4fa3c7' },
    { code: 'M', name: 'emotions', color: '#9aa1b0' },
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
