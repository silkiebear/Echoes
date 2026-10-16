// Synthetic "wide" tracker export: many filler labels plus planted exposure/outcome pairs and streaks.
// Deterministic for a given (cfg, seed). Each stream uses its own PRNG (seed + STREAM_SPACING * index) so adding
// fillers never changes the planted series. Output: { labels, moodNames, entries, days, meta }.

import { addDays, weekdayOf } from './calendar.js';
import { mulberry32 } from './synth.js';

// Plant label texts in id order: exposure/outcome pairs for up, down, late, then two streaks.
const PLANT_TEXTS = [
  'Plant up X', 'Plant up Y',
  'Plant down X', 'Plant down Y',
  'Plant late X', 'Plant late Y',
  'Streak A', 'Streak B',
];

// Fixed stream layout. Plants keep these indices regardless of fillerCount, so the plant series is stable.
const STREAM_UP = 0;
const STREAM_DOWN = 1;
const STREAM_LATE = 2;
const STREAM_STREAK_A = 3;
const STREAM_STREAK_B = 4;
const STREAM_FILLER = 5;

// Seed gap between streams: far larger than the stream count, so no two streams share a seed.
const STREAM_SPACING = 1000;

function streamRnd(seed, index) {
  return mulberry32(seed + STREAM_SPACING * index);
}

// up/down/late shape: X(t) ~ Bernoulli(pExposure); Y(t) ~ Bernoulli(pGiven when X(t-lag) present else pBase).
// startAt gates the effect off before that day (late plant); before it, Y ~ pBase.
function upType(rnd, days, lag, pExposure, pBase, pGiven, startAt) {
  const x = new Uint8Array(days);
  const y = new Uint8Array(days);
  for (let t = 0; t < days; t += 1) {
    x[t] = rnd() < pExposure ? 1 : 0;
    const gated = startAt != null && t < startAt;
    const prior = !gated && t >= lag ? x[t - lag] : 0;
    const p = prior === 1 ? pGiven : pBase;
    y[t] = rnd() < p ? 1 : 0;
  }
  return [x, y];
}

// Independent two-state chain: day 0 starts at 0, P(next 1 | prev 1) = pStay, P(next 1 | prev 0) = pStart.
function streakChain(rnd, days, pStay, pStart) {
  const s = new Uint8Array(days);
  let prev = 0;
  for (let t = 0; t < days; t += 1) {
    const p = prev === 1 ? pStay : pStart;
    prev = rnd() < p ? 1 : 0;
    s[t] = prev;
  }
  return s;
}

// Log-uniform rate in [lo, hi]: draw once per filler so each filler keeps a fixed daily rate.
function logUniform(rnd, lo, hi) {
  const u = rnd();
  return Math.exp(Math.log(lo) + u * (Math.log(hi) - Math.log(lo)));
}

export function generateWide(cfg, seed, fillerCount = cfg.fillerCount) {
  const { days, startDate, baseRate, plants } = cfg;
  const startAt = Math.floor(days * plants.late.startFraction);

  const labels = PLANT_TEXTS.map((text, id) => ({ id, text }));
  for (let i = 0; i < fillerCount; i += 1) {
    labels.push({ id: PLANT_TEXTS.length + i, text: `Filler ${String(i + 1).padStart(3, '0')}` });
  }

  const baseRates = [];
  for (let i = 0; i < fillerCount; i += 1) {
    baseRates.push(logUniform(streamRnd(seed, STREAM_FILLER + i), baseRate.min, baseRate.max));
  }

  const dayIds = Array.from({ length: days }, () => []);
  const push = (t, id, value) => { if (value) dayIds[t].push(id); };

  const [upX, upY] = upType(streamRnd(seed, STREAM_UP), days, plants.up.lag, plants.up.pExposure, plants.up.pBase, plants.up.pGiven);
  for (let t = 0; t < days; t += 1) { push(t, 0, upX[t]); push(t, 1, upY[t]); }

  const [downX, downY] = upType(streamRnd(seed, STREAM_DOWN), days, plants.down.lag, plants.down.pExposure, plants.down.pBase, plants.down.pGiven);
  for (let t = 0; t < days; t += 1) { push(t, 2, downX[t]); push(t, 3, downY[t]); }

  const [lateX, lateY] = upType(streamRnd(seed, STREAM_LATE), days, plants.late.lag, plants.late.pExposure, plants.late.pBase, plants.late.pGiven, startAt);
  for (let t = 0; t < days; t += 1) { push(t, 4, lateX[t]); push(t, 5, lateY[t]); }

  const streakA = streakChain(streamRnd(seed, STREAM_STREAK_A), days, plants.streak.pStay, plants.streak.pStart);
  const streakB = streakChain(streamRnd(seed, STREAM_STREAK_B), days, plants.streak.pStay, plants.streak.pStart);
  for (let t = 0; t < days; t += 1) { push(t, 6, streakA[t]); push(t, 7, streakB[t]); }

  for (let i = 0; i < fillerCount; i += 1) {
    const rnd = streamRnd(seed, STREAM_FILLER + i);
    const rate = baseRates[i];
    for (let t = 0; t < days; t += 1) { push(t, PLANT_TEXTS.length + i, rnd() < rate ? 1 : 0); }
  }

  const daysOut = [];
  const entriesOut = [];
  for (let t = 0; t < days; t += 1) {
    const iso = addDays(startDate, t);
    const weekday = weekdayOf(iso);
    const ids = [...new Set(dayIds[t])].sort((a, b) => a - b);
    daysOut.push({ day: t, date: iso, weekday, labels: ids, entryCount: 1, moods: [] });
    entriesOut.push({ date: iso, minutes: null, day: t, labels: ids, moods: [] });
  }

  return { labels, moodNames: [], entries: entriesOut, days: daysOut, meta: { baseRates } };
}
