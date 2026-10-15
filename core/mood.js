// Mood ordering helpers. Pure functions: no I/O, no mutation of inputs.

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
  const entry = moods.find((m) => m.name === name);
  if (!entry) {
    return null;
  }
  // order 1 is best, so score is highest when order is lowest.
  return moods.length - entry.order + 1;
}

function missingMoods(settings, moodNames) {
  const present = new Set(settings.moods.map((m) => m.name));
  const seen = new Set();
  const missing = [];
  for (const name of moodNames) {
    // Keep first-appearance order and report each missing name once.
    if (seen.has(name) || present.has(name)) {
      continue;
    }
    seen.add(name);
    missing.push(name);
  }
  return missing;
}

function applyOrder(settings, ordered, palette) {
  const n = ordered.length;
  const byName = new Map(settings.moods.map((m) => [m.name, m]));
  return ordered.map((entry) => {
    const existing = byName.get(entry.name);
    // Keep a stored colour when the mood is already known; otherwise colour by rank.
    const color = existing ? existing.color : colorFor(entry.order - 1, n, palette);
    return { name: entry.name, order: entry.order, color };
  });
}

export { orderFromTaps, colorFor, moodScore, missingMoods, applyOrder };
