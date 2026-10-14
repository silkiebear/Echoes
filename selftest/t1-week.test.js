import { test, assert } from '../core/harness.js';
import { buildYearData } from '../core/time-demo.js';
import { viewSettings } from '../config/views.js';

// Hand-built synth: one week, Monday 2026-10-12 to Sunday 2026-10-18, all in 2026.
function weekSynth() {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const date = `2026-10-${String(12 + i).padStart(2, '0')}`;
    days.push({ day: i, date, weekday: 0, labels: [], mood: 3 });
  }
  return { labels: [{ id: 0, text: 'Test X' }], days };
}

test('T1 weeks: with time.weekStart 1, Monday lands in the first row and column of the grid', () => {
  assert.equal(viewSettings.time.weekStart, 1, 'this test assumes Monday-first');
  const data = buildYearData(weekSynth(), 2026, 0);
  const monday = data.days[0];
  assert.equal(monday.row, 0, 'Monday is row 0');
  assert.equal(Math.floor((monday.index + data.firstRow) / 7), 0, 'Monday is in column 0');
  const sunday = data.days[6];
  assert.equal(sunday.row, 6, 'Sunday is row 6');
  assert.equal(Math.floor((sunday.index + data.firstRow) / 7), 0, 'Sunday is in the same column as Monday');
});
