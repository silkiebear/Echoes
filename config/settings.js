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
  moodPalette: ['#3f9e6b', '#7cbf5a', '#c9c24a', '#e0953a', '#c4553f', '#8a6fb8', '#5b9bd5'],
  q2: { maxRows: 200 },
  completeness: { minMarksFraction: 0.25 },
};
