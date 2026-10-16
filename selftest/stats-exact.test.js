import { test, assert } from '../core/harness.js';
import { fisherUpper, fisherLower, fisherTwoSided } from '../core/stats/exact.js';

const near = (a, b, tol) => Math.abs(a - b) <= tol;

// Exact hypergeometric tails over the true support, using BigInt binomials.
function binom(n, k) {
  if (k < 0 || k > n) return 0n;
  if (k > n - k) k = n - k;
  let r = 1n;
  for (let i = 1n; i <= BigInt(k); i += 1n) {
    r = (r * (BigInt(n) - i + 1n)) / i;
  }
  return r;
}

function support(K, N, n) {
  const min = Math.max(0, n + K - N);
  const max = Math.min(n, K);
  return { min, max };
}

// Exact upper tail P(X >= k) as a float, summed over the real support.
function exactUpper(K, N, n, k) {
  const { min, max } = support(K, N, n);
  const denom = binom(N, n);
  let num = 0n;
  for (let x = min; x <= max; x += 1) {
    if (x >= k) num += binom(K, x) * binom(N - K, n - x);
  }
  return Number(num) / Number(denom);
}

function exactLower(K, N, n, k) {
  const { min, max } = support(K, N, n);
  const denom = binom(N, n);
  let num = 0n;
  for (let x = min; x <= max; x += 1) {
    if (x <= k) num += binom(K, x) * binom(N - K, n - x);
  }
  return Number(num) / Number(denom);
}

const TOL = 1e-12;

function expectNear(actual, expected, msg) {
  assert.ok(near(actual, expected, TOL), `${msg}: expected ${expected}, got ${actual}`);
}

test('fisher tails on the N=10 K=4 n=3 table', () => {
  expectNear(fisherUpper(0, 3, 4, 10), 1, 'upper k=0');
  expectNear(fisherLower(0, 3, 4, 10), 1 / 6, 'lower k=0');
  expectNear(fisherTwoSided(0, 3, 4, 10), 1 / 3, 'twoSided k=0');

  expectNear(fisherUpper(1, 3, 4, 10), 5 / 6, 'upper k=1');
  expectNear(fisherLower(1, 3, 4, 10), 2 / 3, 'lower k=1');
  expectNear(fisherTwoSided(1, 3, 4, 10), 1, 'twoSided k=1');

  expectNear(fisherUpper(2, 3, 4, 10), 1 / 3, 'upper k=2');
  expectNear(fisherLower(2, 3, 4, 10), 29 / 30, 'lower k=2');
  expectNear(fisherTwoSided(2, 3, 4, 10), 2 / 3, 'twoSided k=2');

  expectNear(fisherUpper(3, 3, 4, 10), 1 / 30, 'upper k=3');
  expectNear(fisherLower(3, 3, 4, 10), 1, 'lower k=3');
  expectNear(fisherTwoSided(3, 3, 4, 10), 1 / 15, 'twoSided k=3');
});

test('fisher tails on the N=10 K=8 n=5 table', () => {
  expectNear(fisherUpper(3, 5, 8, 10), 1, 'upper k=3');
  expectNear(fisherLower(3, 5, 8, 10), 2 / 9, 'lower k=3');
  expectNear(fisherTwoSided(3, 5, 8, 10), 4 / 9, 'twoSided k=3');

  expectNear(fisherUpper(4, 5, 8, 10), 7 / 9, 'upper k=4');
  expectNear(fisherLower(4, 5, 8, 10), 7 / 9, 'lower k=4');
  expectNear(fisherTwoSided(4, 5, 8, 10), 1, 'twoSided k=4');

  expectNear(fisherUpper(5, 5, 8, 10), 2 / 9, 'upper k=5');
  expectNear(fisherLower(5, 5, 8, 10), 1, 'lower k=5');
  expectNear(fisherTwoSided(5, 5, 8, 10), 4 / 9, 'twoSided k=5');
});

test('fisher out of support returns the flat tails', () => {
  expectNear(fisherUpper(4, 3, 4, 10), 0, 'above max is 0');
  expectNear(fisherLower(-1, 3, 4, 10), 0, 'below min is 0');
  expectNear(fisherUpper(0, 3, 4, 10), 1, 'below min upper is 1');
  expectNear(fisherLower(3, 3, 4, 10), 1, 'above max lower is 1');

  expectNear(fisherUpper(2, 5, 8, 10), 1, 'just below min upper is 1');
  expectNear(fisherLower(2, 5, 8, 10), 0, 'just below min lower is 0');
});

test('fisher large cases', () => {
  expectNear(fisherUpper(2, 500, 2, 1000), 249500 / 999000, 'N=1000 K=2 n=500 k=2');
  expectNear(fisherUpper(1, 500, 1, 1000), 0.5, 'N=1000 K=1 n=500 k=1 upper');
  expectNear(fisherLower(1, 500, 1, 1000), 1, 'N=1000 K=1 n=500 k=1 lower');

  const tiny = fisherUpper(300, 300, 300, 2000);
  assert.ok(Number.isFinite(tiny), 'no NaN or Infinity');
  assert.ok(tiny >= 0 && tiny <= 1e-300, 'a finite tail within [0,1e-300]');
});

test('fisher matches exact BigInt tails for every small case', () => {
  for (let N = 1; N <= 8; N += 1) {
    for (let K = 0; K <= N; K += 1) {
      for (let n = 0; n <= N; n += 1) {
        for (let k = -1; k <= N + 1; k += 1) {
          const up = fisherUpper(k, n, K, N);
          const lo = fisherLower(k, n, K, N);
          assert.ok(up >= 0 && up <= 1, `upper in [0,1] N=${N} K=${K} n=${n} k=${k}`);
          assert.ok(lo >= 0 && lo <= 1, `lower in [0,1] N=${N} K=${K} n=${n} k=${k}`);
          expectNear(up, exactUpper(K, N, n, k), `upper N=${N} K=${K} n=${n} k=${k}`);
          expectNear(lo, exactLower(K, N, n, k), `lower N=${N} K=${K} n=${n} k=${k}`);
        }
      }
    }
  }
});

test('fisherTwoSided equals min(1, 2*min(upper,lower))', () => {
  for (let N = 1; N <= 6; N += 1) {
    for (let K = 0; K <= N; K += 1) {
      for (let n = 0; n <= N; n += 1) {
        for (let k = -1; k <= N + 1; k += 1) {
          const up = fisherUpper(k, n, K, N);
          const lo = fisherLower(k, n, K, N);
          const expected = Math.min(1, 2 * Math.min(up, lo));
          assert.ok(near(fisherTwoSided(k, n, K, N), expected, TOL), `twoSided N=${N} K=${K} n=${n} k=${k}`);
        }
      }
    }
  }
});

test('fisher throws RangeError on invalid arguments', () => {
  const check = (fn, msg) => {
    const err = assert.throws(fn, null, msg);
    assert.ok(err instanceof RangeError, `${msg} is a RangeError`);
  };
  check(() => fisherUpper(2, 3, 4, 10.5), 'non-integer N');
  check(() => fisherUpper(2, 3.5, 4, 10), 'non-integer n');
  check(() => fisherLower(2, 3, -4, 10), 'negative K');
  check(() => fisherTwoSided(2, 3, 4, -10), 'negative N');
  check(() => fisherUpper(2, 11, 4, 10), 'n > N');
  check(() => fisherLower(2, 3, 11, 10), 'K > N');
});
