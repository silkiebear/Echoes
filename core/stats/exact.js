// Fisher exact test for a 2x2 table with fixed margins: a hypergeometric X with population N, K outcome days and
// n exposed days. Tails are summed directly over the support in log space, so no tail is taken as 1 minus the other.
const logFact = [0];

function logFactorial(n) {
  for (let i = logFact.length; i <= n; i += 1) logFact.push(logFact[i - 1] + Math.log(i));
  return logFact[n];
}

function logChoose(n, k) {
  return logFactorial(n) - logFactorial(k) - logFactorial(n - k);
}

function pmf(x, N, K, n) {
  return Math.exp(logChoose(K, x) + logChoose(N - K, n - x) - logChoose(N, n));
}

function clamp01(x) {
  return Math.min(1, Math.max(0, x));
}

// Error messages name the argument only, never its value (diagnostics rule).
function checkArgs(k, n, K, N) {
  for (const [name, value] of [['n', n], ['K', K], ['N', N]]) {
    if (!Number.isInteger(value) || value < 0) throw new RangeError(`${name} must be a non-negative integer`);
  }
  if (!Number.isInteger(k)) throw new RangeError('k must be an integer');
  if (n > N) throw new RangeError('n must not exceed N');
  if (K > N) throw new RangeError('K must not exceed N');
}

function support(N, K, n) {
  return { lo: Math.max(0, n + K - N), hi: Math.min(n, K) };
}

// P(X >= k)
export function fisherUpper(k, n, K, N) {
  checkArgs(k, n, K, N);
  const { lo, hi } = support(N, K, n);
  if (k <= lo) return 1;
  if (k > hi) return 0;
  let sum = 0;
  for (let x = k; x <= hi; x += 1) sum += pmf(x, N, K, n);
  return clamp01(sum);
}

// P(X <= k)
export function fisherLower(k, n, K, N) {
  checkArgs(k, n, K, N);
  const { lo, hi } = support(N, K, n);
  if (k < lo) return 0;
  if (k >= hi) return 1;
  let sum = 0;
  for (let x = lo; x <= k; x += 1) sum += pmf(x, N, K, n);
  return clamp01(sum);
}

export function fisherTwoSided(k, n, K, N) {
  return Math.min(1, 2 * Math.min(fisherUpper(k, n, K, N), fisherLower(k, n, K, N)));
}
