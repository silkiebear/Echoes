import { test, assert } from '../core/harness.js';
import { synth as cfg } from '../config/synth.js';
import { windows } from '../config/windows.js';
import { viewSettings } from '../config/views.js';
import { generate } from '../core/synth.js';
import { computeEchoes } from '../core/echo-demo.js';

const SHORTEST = 0; // index of the 1d window in config/windows.js

function rateRatio(data, exposureText, outcomeText) {
  const echoes = computeEchoes(data, windows, viewSettings.echo);
  const idOf = (text) => data.labels.find((l) => l.text === text).id;
  const rec = echoes.table.find((r) => r.exposure === idOf(exposureText) && r.outcome === idOf(outcomeText) && r.window === SHORTEST);
  return rec.rr;
}

test('same seed gives deep-equal output', () => {
  assert.deepEqual(generate(cfg), generate(cfg));
});

test('a different seed gives different output', () => {
  const a = generate(cfg);
  const b = generate({ ...cfg, seed: cfg.seed + 1 });
  assert.ok(JSON.stringify(a.days) !== JSON.stringify(b.days), 'days should differ');
});

test('label and day counts match config and labels follow the SPEC 11 format', () => {
  const data = generate(cfg);
  assert.equal(data.labels.length, cfg.labels.length, 'label count');
  assert.ok(data.labels.length >= cfg.expect.labelCount[0] && data.labels.length <= cfg.expect.labelCount[1], 'label count range');
  assert.equal(data.days.length, cfg.days, 'day count');
  for (const label of data.labels) {
    assert.ok(/^[A-Za-z].* [A-Z0-9][a-z0-9]?[+\-=]$/.test(label.text), `label format: ${label.text}`);
  }
});

test('planted effect 1 (late coffee to poor sleep, 1 day) is inside its expected range', () => {
  const rr = rateRatio(generate(cfg), cfg.effects[0].exposure, cfg.effects[0].outcome);
  const [lo, hi] = cfg.expect.coffeeSleep1d;
  assert.ok(rr >= lo && rr <= hi, `rate ratio ${rr} outside [${lo}, ${hi}]`);
});

test('planted effect 2 (alcohol to headache, 1 day) is inside its expected range', () => {
  const rr = rateRatio(generate(cfg), cfg.effects[1].exposure, cfg.effects[1].outcome);
  const [lo, hi] = cfg.expect.alcoholHeadache1d;
  assert.ok(rr >= lo && rr <= hi, `rate ratio ${rr} outside [${lo}, ${hi}]`);
});
