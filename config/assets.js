// Texts for the stale-asset marker (core\env.js and modules\status.js). The CSS side is the
// --build custom property in app\styles\tokens.css; the JS side is version.build.
// Placeholders {build}, {css} and {js} are filled in by core\env.js.
export const assets = {
  okText: 'ok ({build})',
  staleText: 'STALE css={css} js={js}',
  unknownText: 'n/a',
  staleSentence: 'Stale files: reload with the cache cleared.',
};
