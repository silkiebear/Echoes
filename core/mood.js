// Mood ordering helpers. Pure functions: no I/O, no mutation of inputs.

// Mood names match after trim and case-folding (SPEC 12). The stored name keeps its own spelling.
function moodKey(name) {
  return String(name).trim().toLowerCase();
}

// A linear search, not an object lookup, so names such as "__proto__" cannot reach prototype properties.
function findMood(moods, name) {
  const key = moodKey(name);
  return moods.find((m) => moodKey(m.name) === key);
}

function orderFromTaps(allNames, tappedNames) {
  const allowed = new Set(allNames);
  const taken = new Set();
  const result = [];
  for (const name of tappedNames) {
    // Skip taps for names we do not track, and skip duplicate taps of the same name.
    if (!allowed.has(name) || taken.has(name)) {
      continue;
    }
    taken.add(name);
    result.push({ name, order: result.length + 1 });
  }
  return result;
}

function colorFor(rank, n, palette) {
  // With one mood there is nothing to spread across, so it takes the best colour.
  if (n <= 1) {
    return palette[0];
  }
  const index = Math.round(rank / (n - 1) * (palette.length - 1));
  return palette[index];
}

function moodScore(settings, name) {
  const moods = settings.moods;
  const entry = findMood(moods, name);
  if (!entry) {
    return null;
  }
  // order 1 is best, so score is highest when order is lowest.
  return moods.length - entry.order + 1;
}

function missingMoods(settings, moodNames) {
  const present = new Set(settings.moods.map((m) => moodKey(m.name)));
  const seen = new Set();
  const missing = [];
  for (const name of moodNames) {
    const key = moodKey(name);
    // Keep first-appearance order and report each missing name once.
    if (seen.has(key) || present.has(key)) {
      continue;
    }
    seen.add(key);
    missing.push(name);
  }
  return missing;
}

function applyOrder(settings, ordered, palette) {
  const n = ordered.length;
  const byKey = new Map(settings.moods.map((m) => [moodKey(m.name), m]));
  return ordered.map((entry) => {
    const existing = byKey.get(moodKey(entry.name));
    // A known mood keeps its stored spelling and colour; otherwise the name is kept and coloured by rank.
    const color = existing ? existing.color : colorFor(entry.order - 1, n, palette);
    return { name: existing ? existing.name : entry.name, order: entry.order, color };
  });
}

export { orderFromTaps, colorFor, moodScore, missingMoods, applyOrder };
