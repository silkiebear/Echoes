// Explore: the E views on your data (phase 4d, 4d.4). The first selected label is the event, the second the outcome.
// E1: outcomes by window for the event (from the last Echo scan rows). E2: the curve with its band for the pair. E4:
// before and after the event. Descriptive only; a check for chance is shown only for a pair in the last scan result.
import { views } from '../views/index.js';
import { explore } from '../config/explore.js';
import { exploreEcho } from '../config/explore-echo.js';
import { viewSettings } from '../config/views.js';
import { stats } from '../config/stats.js';
import { windows } from '../config/windows.js';
import * as store from '../core/store.js';
import { makeCard } from '../core/gallery-kit.js';
import { viewDataFor, selectedIds, fill, messageSvg, setNote } from '../core/explore-kit.js';
import { buildE1Real, buildE2Real, buildE4Real } from '../core/echo-real.js';
import { describeRow } from '../core/scan-text.js';
import { prepare } from '../core/stats/prepare.js';

const ui = exploreEcho.ui;
const E = explore.ui;

function viewById(id) {
  return views.find((v) => v.id === id);
}

// The scan result counts only when it was run on the data that is loaded now (its data object is the store's).
function scanFor(s) {
  const r = s.scanResult;
  if (!r) return { none: ui.noScan };
  if (r.data !== s.data) return { none: ui.staleScan };
  return { result: r };
}

// The scan row for the pair; the pair's window when the user picked one from the scan, otherwise the first row.
function rowFor(scan, exposure, outcome, windowId) {
  const rows = scan.rows.filter((r) => r.exposure === exposure && r.outcome === outcome);
  return rows.find((r) => r.window === windowId) ?? rows[0] ?? null;
}

export default {
  id: 'explore-echo',
  title: 'Echo views',
  phase: 4,
  order: 20,
  mount(container) {
    const cards = [];
    let prepared = { data: null, value: null };

    function preparedFor(s) {
      if (prepared.data !== s.data) prepared = { data: s.data, value: prepare({ data: s.data, settings: s.settings }) };
      return prepared.value;
    }

    const e1 = viewById('E1');
    const e1Card = makeCard({
      heading: exploreEcho.ui.e1.heading,
      note: E.descriptive,
      controls: () => [],
      draw: (width) => {
        const s = store.get();
        const ids = selectedIds(s);
        if (!s.data || ids.length < 2) return messageSvg(width, ui.noTwo, E.tabTitle);
        const scan = scanFor(s);
        if (scan.none) return messageSvg(width, scan.none, E.tabTitle);
        const event = s.data.labels[ids[0]].text;
        setNote(e1Card.card, fill(ui.e1.note, { event }));
        const outcomes = [...new Set(scan.result.rows.filter((r) => r.exposure === ids[0]).map((r) => r.outcome))]
          .slice(0, exploreEcho.e1MaxOutcomes);
        if (outcomes.length === 0) return messageSvg(width, fill(ui.noRowsForEvent, { event }), E.tabTitle);
        return e1.render(buildE1Real(scan.result, s.data.labels, windows, ids[0], outcomes), { width });
      },
    });
    cards.push(e1Card);

    const e2 = viewById('E2');
    const e2Card = makeCard({
      heading: exploreEcho.ui.e2.heading,
      note: E.descriptive,
      controls: () => [],
      draw: (width) => {
        const s = store.get();
        const ids = selectedIds(s);
        if (!s.data || ids.length < 2) return messageSvg(width, ui.noTwo, E.tabTitle);
        const [event, outcome] = ids;
        const labels = s.data.labels;
        const scan = scanFor(s);
        let check = scan.none ?? ui.notInScan;
        if (scan.result) {
          const row = rowFor(scan.result, event, outcome, s.pair?.window);
          if (row) check = fill(ui.inScan, { verdict: describeRow(row, labels, windows, scan.result.meta, stats).verdict });
        }
        const cfg = {
          days: viewSettings.curve.days,
          shuffles: stats.placebo.shuffles.fast,
          seed: stats.placebo.seed,
          labels,
          statsCfg: stats,
        };
        const caption = fill(exploreEcho.ui.e2.caption, { shuffles: cfg.shuffles });
        const data = buildE2Real(preparedFor(s), event, outcome, cfg);
        setNote(e2Card.card, `${check} ${fill(ui.e2.note, { event: data.eventLabel, outcome: data.outcomeLabel })}`);
        return e2.render(data, { width, caption, desc: exploreEcho.ui.e2.desc });
      },
    });
    cards.push(e2Card);

    const e4 = viewById('E4');
    const e4Card = makeCard({
      heading: exploreEcho.ui.e4.heading,
      note: E.descriptive,
      controls: () => [],
      draw: (width) => {
        const s = store.get();
        const ids = selectedIds(s);
        if (!s.data || ids.length < 2) return messageSvg(width, ui.noTwo, E.tabTitle);
        const event = s.data.labels[ids[0]].text;
        const picked = windows.find((w) => w.id === s.pair?.window);
        const days = picked ? picked.days : viewSettings.eventStudy.defaultWindow;
        const data = buildE4Real(viewDataFor(s), ids[0], days);
        setNote(e4Card.card, fill(ui.e4.note, { event, window: days }));
        if (data.nEvents === 0) return messageSvg(width, fill(ui.noEvents, { event }), E.tabTitle);
        return e4.render(data, { width });
      },
    });
    cards.push(e4Card);

    for (const { card } of cards) container.append(card);

    function refresh() {
      for (const c of cards) c.redraw();
    }

    const unsubscribe = store.subscribe(() => {
      if (!container.isConnected) {
        unsubscribe();
        return;
      }
      refresh();
    });
    refresh();
  },
};
