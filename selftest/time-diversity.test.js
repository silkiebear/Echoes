import { test, assert } from '../core/harness.js';
import { timeDiversity } from '../core/time-diversity.js';
import { timeDiversity as diversityCfg } from '../config/flags.js';

function entry(minutes) {
  return { date: '2026-01-01', minutes, day: '2026-01-01', labels: [0] };
}

test('diversity: varied spread is not low', () => {
  const list = [];
  for (let i = 0; i < 200; i += 1) {
    list.push(entry((i * 97 + 60 * (i % 17)) % 1440));
  }
  const { low } = timeDiversity(list, diversityCfg);
  assert.equal(low, false, 'varied minutes should not be flagged low');
});

test('diversity: all entries at one minute is low', () => {
  const list = [];
  for (let i = 0; i < 50; i += 1) {
    list.push(entry(720));
  }
  const { low } = timeDiversity(list, diversityCfg);
  assert.equal(low, true, 'all at one minute should be low');
});

test('diversity: 85 percent at one timestamp is low', () => {
  const list = [];
  for (let i = 0; i < 85; i += 1) {
    list.push(entry(720));
  }
  const rest = [0, 60, 120, 180, 240, 300, 360, 420, 480, 540, 600, 660, 780, 840, 900];
  for (let i = 0; i < 15; i += 1) {
    list.push(entry(rest[i]));
  }
  const { low } = timeDiversity(list, diversityCfg);
  assert.equal(low, true, '85 percent at one timestamp should be low');
});

test('diversity: 70 percent at one timestamp over 8 hours is not low', () => {
  const list = [];
  for (let i = 0; i < 70; i += 1) {
    list.push(entry(720));
  }
  const hours = [0, 60, 120, 180, 240, 300, 360, 420];
  for (let i = 0; i < 30; i += 1) {
    list.push(entry(hours[i % 8]));
  }
  const { low } = timeDiversity(list, diversityCfg);
  assert.equal(low, false, 'spread over many hours should not be low');
});

test('diversity: empty list is not low and n is 0', () => {
  const { n, low } = timeDiversity([], diversityCfg);
  assert.equal(n, 0, 'empty list has n 0');
  assert.equal(low, false, 'empty list is not low');
});
