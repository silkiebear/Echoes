// "In this chart" sentences (phase 4e, 4e.1). One or two plain sentences per Explore card, computed from the data the
// card draws, so every number is a count of the same days or entries the chart shows. Pure: no DOM. Label texts reach
// the page through textContent only. Label texts were registered with diag when the export was parsed
// (export-parse.js), so diagnostics without data sections redact them. Percentages follow exploreHelp.live.percentDigits.
import { exploreHelp } from '../config/explore-help.js';
import { monthYear, monthShort } from './time-demo.js';

const digits = exploreHelp.live.percentDigits;
// A day has 24 clock hours; the dial bins divide 24 (period-demo.js).
const HOURS = 24;

function pct(share) {
  return `${(share * 100).toFixed(digits)}%`;
}

// First index of the largest value (ties keep the earlier index).
function argmax(values) {
  let best = 0;
  values.forEach((v, i) => {
    if (v > values[best]) best = i;
  });
  return best;
}

// Days with the label per weekday or month, from a profile (profile-demo.js): rate x n is the day count of the bar.
function profileCounts(rows) {
  const counts = rows.map((r) => Math.round(r.rate * r.n));
  const observed = rows.reduce((s, r) => s + r.n, 0);
  return { counts, present: counts.reduce((s, c) => s + c, 0), observed };
}

const sentences = {
  // T1 (buildYearData): days of the year with the label.
  T1(data, selection) {
    if (selection.length === 0 || data.days.length === 0) return '';
    const present = data.days.filter((d) => d.present === 1).length;
    return `${selection[0]} is on ${present} days in ${data.year}.`;
  },
  // T2 (buildLanesData): the rows and how many are on the latest day.
  T2(data) {
    if (data.rows.length === 0 || data.span === 0) return '';
    const last = data.span - 1;
    const onLast = data.rows.filter((r) => r.present[last] === 1).length;
    return `${data.rows.length} labels are drawn; on ${data.dates[last]} ${onLast} of them are on.`;
  },
  // T3 (buildStripData): months shown and the busiest month of the first label, by days with the label.
  T3(data, selection) {
    if (selection.length === 0 || data.bins.length === 0) return '';
    const counts = data.bins.map((b) => b.counts[0]);
    const busiest = argmax(counts);
    return `${selection[0]} is shown over ${data.bins.length} months; the busiest month is ${monthYear(`${data.bins[busiest].key}-01`)} with ${counts[busiest]} days.`;
  },
  // T4 (buildRollingData): the highest share of the first label over the windows.
  T4(data, selection) {
    if (selection.length === 0 || data.series.length === 0 || data.series[0].values.length === 0) return '';
    const values = data.series[0].values;
    const top = Math.max(...values);
    return `${selection[0]}: the highest share is ${pct(top)} in a window of ${data.window} observed days.`;
  },
  // P1 (buildHourGrid): the marks at timed entries and the busiest square.
  P1(data) {
    if (data.total === 0) return `${data.title} has no marks at timed entries.`;
    let best = { r: 0, c: 0, v: -1 };
    data.cells.forEach((row, r) => row.forEach((v, c) => {
      if (v > best.v) best = { r, c, v };
    }));
    const square = `${data.rows[best.r]} at ${best.c}:00`;
    if (data.metric === 'share') return `${data.title} has ${data.total} marks at timed entries; the busiest square is ${square}, ${pct(best.v)} of the marks.`;
    return `${data.title} has ${data.total} marks at timed entries; the busiest square is ${square} with ${best.v} marks.`;
  },
  // P2 (buildDial): the first series, its marks and the busiest hour.
  P2(data) {
    const series = data.series[0];
    if (!series) return '';
    const sum = series.bins.reduce((s, v) => s + v, 0);
    if (sum === 0) return `${series.label} has no marks at timed entries.`;
    const busiest = argmax(series.bins);
    const hour = busiest * (HOURS / series.bins.length);
    return `${series.label} has ${sum} marks at timed entries; the busiest hour is ${hour}:00 with ${series.bins[busiest]} marks.`;
  },
  // P3 (buildWeekdayProfile): days with the label over observed days, and the weekday with the most days.
  P3(data) {
    const { counts, present, observed } = profileCounts(data.rows);
    const top = argmax(counts);
    return `${data.title} was logged on ${present} of ${observed} observed days; the highest weekday is ${data.rows[top].label} with ${counts[top]} days.`;
  },
  // P4 (buildMonthProfile): as P3, by month of the year.
  P4(data) {
    const { counts, present, observed } = profileCounts(data.rows);
    const top = argmax(counts);
    return `${data.title} was logged on ${present} of ${observed} observed days; the highest month is ${monthShort(data.rows[top].month)} with ${counts[top]} days.`;
  },
  // E1 (buildE1Real): cells with a scan row, out of all cells.
  E1(data, selection) {
    const total = data.outcomes.length * data.windows.length;
    if (selection.length === 0 || total === 0) return '';
    const kept = data.cells.flat().filter((cell) => cell.rr !== null).length;
    return `${selection[0]} has a scan row in ${kept} of ${total} cells; the other cells are n/a.`;
  },
  // E2 (buildE2Real): the rate one day after the event, against the usual rate.
  E2(data) {
    const first = data.points.find((p) => p.day === 1);
    if (!first) return '';
    if (first.rate === null) return `${data.eventLabel} to ${data.outcomeLabel}: no observed day one day after the event.`;
    return `${data.eventLabel} to ${data.outcomeLabel}: one day after the event the outcome rate is ${pct(first.rate)}, against a usual ${pct(data.baseline)}.`;
  },
  // E4 (buildE4Real): the events (days with a full window and no event in the gap) and the largest change, after minus
  // before, in percentage points.
  E4(data) {
    if (data.nEvents === 0 || data.rows.length === 0) return '';
    const top = data.rows[0];
    const change = (top.diff * 100).toFixed(digits);
    const sign = top.diff > 0 ? '+' : '';
    return `${data.eventLabel} has ${data.nEvents} events; the largest change is for ${top.outcomeLabel}: ${sign}${change} points (after minus before).`;
  },
};

// The sentence for one card. data: what the card draws (the builder's output); selection: the label texts the card
// uses, first first. Returns '' when there is nothing to say (the card then shows its own message).
export function liveSentence(cardId, data, selection = []) {
  const make = sentences[cardId];
  if (!make || !data) return '';
  return make(data, selection);
}
