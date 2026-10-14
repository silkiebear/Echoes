// E4 event study. Demo flags only: lowSample is shown, but there is no
// placebo test and no FDR correction in this phase.
import { viewSettings } from '../config/views.js';
const E = viewSettings.eventStudy;

function has(synth, id, t) {
  return synth.days[t].labels.includes(id);
}

export function buildE4Data(synth, exposureId, windowDays) {
  const n = synth.days.length;
  const gap = E.gapDays;
  const window = windowDays;

  const outcomeIds = synth.labels
    .filter((l) => l.id !== exposureId)
    .map((l) => l.id);
  const textById = (id) => synth.labels.find((l) => l.id === id).text;

  const eventDays = [];
  for (let t = 0; t < n; t += 1) {
    if (!has(synth, exposureId, t)) {
      continue;
    }
    let isEvent = true;
    for (let k = 1; k <= gap; k += 1) {
      const prev = t - k;
      if (prev >= 0 && has(synth, exposureId, prev)) {
        isEvent = false;
        break;
      }
    }
    if (!isEvent) {
      continue;
    }
    if (t - window < 0 || t + window > n - 1) {
      continue;
    }
    eventDays.push(t);
  }

  const nEvents = eventDays.length;
  if (nEvents === 0) {
    return {
      eventLabel: textById(exposureId),
      windowDays,
      nEvents: 0,
      rows: [],
    };
  }

  const rows = outcomeIds.map((o) => {
    let beforeSum = 0;
    let afterSum = 0;
    for (const t of eventDays) {
      let before = 0;
      let after = 0;
      for (let t2 = t - window; t2 <= t - 1; t2 += 1) {
        if (has(synth, o, t2)) {
          before += 1;
        }
      }
      for (let t2 = t + 1; t2 <= t + window; t2 += 1) {
        if (has(synth, o, t2)) {
          after += 1;
        }
      }
      beforeSum += before / window;
      afterSum += after / window;
    }
    const before = beforeSum / nEvents;
    const after = afterSum / nEvents;
    const diff = after - before;
    return {
      outcomeLabel: textById(o),
      before,
      after,
      diff,
      flags: nEvents < E.minEvents ? ['lowSample'] : [],
    };
  });

  rows.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  return {
    eventLabel: textById(exposureId),
    windowDays,
    nEvents,
    rows: rows.slice(0, E.maxRows),
  };
}
