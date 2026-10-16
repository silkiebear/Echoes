// Rates and their ratio and difference for one cell: exposed rate k/n against base rate K/N.
// A field is null when its denominator is zero, so the card can show "no value" instead of Infinity or NaN.
export function rateStats(k, n, K, N) {
  const rate = n === 0 ? null : k / n;
  const base = N === 0 ? null : K / N;
  const rr = rate === null || base === null || base === 0 ? null : rate / base;
  const diff = rate === null || base === null ? null : rate - base;
  return { rate, base, rr, diff };
}
