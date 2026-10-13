import { test, assert } from '../core/harness.js';
import { clampFactor, pinchFactor, scrollForFocal } from '../core/zoom.js';
import { viewSettings } from '../config/views.js';

const { min, max } = viewSettings.zoom;
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg}: ${a} vs ${b}`);

test('clampFactor keeps the factor between min and max', () => {
  assert.equal(clampFactor(0.2, min, max), min, 'below min');
  assert.equal(clampFactor(9, min, max), max, 'above max');
  assert.equal(clampFactor(2, min, max), 2, 'inside');
});

test('the + and - step from the start factor 1 reaches the limits and stays inside them', () => {
  let f = 1;
  for (let i = 0; i < 20; i++) f = clampFactor(f * viewSettings.zoom.step, min, max);
  assert.equal(f, max, 'repeated + reaches max');
  for (let i = 0; i < 20; i++) f = clampFactor(f / viewSettings.zoom.step, min, max);
  assert.equal(f, min, 'repeated - reaches min');
});

test('pinchFactor scales with the finger distance and is clamped', () => {
  near(pinchFactor(1, 100, 200, min, max), 2, 'double distance doubles the factor');
  near(pinchFactor(2, 100, 50, min, max), 1, 'half distance halves the factor');
  assert.equal(pinchFactor(1, 100, 1000, min, max), max, 'large spread clamps to max');
  assert.equal(pinchFactor(1, 100, 1, min, max), min, 'tiny spread clamps to min');
  assert.equal(pinchFactor(1.5, 0, 80, min, max), 1.5, 'zero start distance keeps the start factor');
});

test('scrollForFocal keeps the content point under the focal point fixed', () => {
  // Content point under focal 150 at scroll 40, factor 1: x = 190 (base units).
  const scroll = scrollForFocal(40, 150, 1, 2);
  near(scroll, 190 * 2 - 150, 'new scroll puts x = 190 at focal 150 with factor 2');
  // Round trip back to factor 1 returns the original offset.
  near(scrollForFocal(scroll, 150, 2, 1), 40, 'zoom out returns to the same scroll');
});

test('scrollForFocal never goes negative and ignores a zero old factor', () => {
  assert.equal(scrollForFocal(0, 0, 1, 1.25), 0, 'focal at the top-left corner');
  assert.equal(scrollForFocal(10, 5, 0, 2), 10, 'zero old factor leaves scroll unchanged');
});
