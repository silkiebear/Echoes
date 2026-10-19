// Texts for the stale-asset marker (core\env.js and modules\status.js). The CSS side is the
// --build custom property in app\styles\tokens.css; the JS side is version.build.
// Placeholders {build}, {css} and {js} are filled in by core\env.js.
export const assets = {
  okText: 'ok ({build})',
  staleText: 'STALE css={css} js={js}',
  unknownText: 'n/a',
  // Plain sentences for the Status card (phase 4f.3); the marker texts above stay for the diagnostics file.
  statusOk: 'Page files are up to date.',
  statusStale: 'Some page files are old: reload the page.',
  statusUnknown: 'The state of the page files cannot be checked here.',
};
