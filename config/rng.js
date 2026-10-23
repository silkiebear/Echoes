// Constants of the seeded random generator (mulberry32, core\rng.js). The numbers are written out so that every browser
// and Node run the same algorithm and gives the same values for the same seed.
export const rng = {
  // Added to the state on each call (a fixed odd step, so every state is visited once before a repeat).
  increment: 1831565813,
  // Bit shifts of the first mixing step.
  shiftA: 15,
  // Bit shift and multiplier of the second mixing step (61 is the mulberry32 multiplier).
  shiftB: 7,
  mulB: 61,
  // Bit shift of the final mixing step.
  shiftC: 14,
  // 2^32: turns the 32-bit unsigned output into a number in [0, 1).
  range: 4294967296,
};
