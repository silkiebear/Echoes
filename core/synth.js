// Synthetic tracker-like data with planted effects. Output is deterministic for a given config.
// Config shape: see app/config/synth.js. Output: { labels: [{id, text, code}], days: [{day, date, weekday, labels}] }.

const DAY_MS = 86400000;
const SATURDAY = 6;
const SUNDAY = 0;

// mulberry32: small seeded PRNG (standard constants). Chosen so no dependency is needed.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// True when the exposure happened on any day in the effect's lag range before day t.
function exposedInLagRange(effect, exposureDays, t) {
  for (let k = effect.lagMin; k <= effect.lagMax; k++) {
    if (t - k >= 0 && exposureDays[t - k]) return true;
  }
  return false;
}

export function generate(cfg) {
  const rnd = mulberry32(cfg.seed);
  const labels = cfg.labels.map((label, id) => ({ id, text: `${label.name} ${label.code}`, code: label.code }));
  const idOf = new Map(labels.map((label) => [label.text, label.id]));
  const effectByOutcome = new Map(cfg.effects.map((e) => [
    idOf.get(e.outcome),
    { exposure: idOf.get(e.exposure), lagMin: e.lagMin, lagMax: e.lagMax, pBase: e.pBase, pExposed: e.pExposed },
  ]));
  const weekdayByLabel = new Map((cfg.weekday || []).map((w) => [idOf.get(w.label), w]));
  const has = labels.map(() => new Uint8Array(cfg.days));
  const start = Date.parse(`${cfg.startDate}T00:00:00Z`);
  const days = [];

  for (let t = 0; t < cfg.days; t++) {
    const date = new Date(start + t * DAY_MS);
    const weekday = date.getUTCDay();
    const isWeekend = weekday === SATURDAY || weekday === SUNDAY;
    const ids = [];
    for (const label of labels) {
      const effect = effectByOutcome.get(label.id);
      const modifier = weekdayByLabel.get(label.id);
      let p = cfg.labels[label.id].p;
      if (effect) {
        p = exposedInLagRange(effect, has[effect.exposure], t) ? effect.pExposed : effect.pBase;
      } else if (modifier) {
        p = isWeekend ? modifier.weekend : modifier.weekday;
      }
      if (rnd() < p) {
        has[label.id][t] = 1;
        ids.push(label.id);
      }
    }
    days.push({ day: t, date: date.toISOString().slice(0, 10), weekday, labels: ids });
  }
  return { labels, days };
}
