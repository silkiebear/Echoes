// A seeded pseudo-random generator (mulberry32) used by the tracker-export views to make
// simulations repeatable: the same seed always gives the same sequence. See config\rng.js.
import { rng as R } from '../config/rng.js';

// makeRng returns a function that yields the next float in [0, 1). The same seed gives the same
// sequence, so a view can run a simulation twice and compare the two runs.
export function makeRng(seed) {
  // A non-integer seed cannot be turned into a 32-bit state, so reject it up front.
  if (!Number.isInteger(seed)) {
    throw new TypeError('seed must be an integer');
  }
  // Seed the 32-bit state; `| 0` truncates to signed 32 bits.
  let a = seed | 0;
  return function next() {
    // Advance the state by a fixed odd step, so every 32-bit state is visited before any repeats.
    a = (a + R.increment) | 0;
    // First mixing step: spread the high bits of the state across the word.
    let t = Math.imul(a ^ (a >>> R.shiftA), 1 | a);
    // Second mixing step: the mulberry32 multiplier folds the bits once more.
    t = (t + Math.imul(t ^ (t >>> R.shiftB), R.mulB | t)) ^ t;
    // Final step: unsigned shift to a 32-bit integer, then scale to [0, 1).
    return ((t ^ (t >>> R.shiftC)) >>> 0) / R.range;
  };
}
