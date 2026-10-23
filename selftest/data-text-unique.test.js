// Data tab text is unique and grouped (browser only, phase 4h.0). Every Data card keeps its group caption words inside
// the "How to read this" block only, and never repeats a sentence in its live text. In Node the test skips like the other
// browser tests; the exported helper is exercised there.
import { test, skip, assert } from '../core/harness.js';
import * as store from '../core/store.js';
import * as diag from '../core/diag.js';
import { app } from '../config/app.js';
import { version } from '../config/version.js';
import { exploreHelp } from '../config/explore-help.js';
import dataMod from '../modules/data-load.js';
import q1Mod from '../modules/q1-coverage.js';
import q2Mod from '../modules/q2-label-coding.js';
import labelMod from '../modules/label-guide.js';
import scanMod from '../modules/echo-scan.js';

// The group caption words come from config, not a hard-coded list, so the test checks exactly what the app prints.
const CAPTIONS = Object.values(exploreHelp.captions);

// A Data card that shows a collapsed "How to read this" block: the module-help cards and the label naming guide card.
const MODULES = [
  [dataMod, 'data-load'],
  [q1Mod, 'q1-coverage'],
  [q2Mod, 'q2-label-coding'],
  [labelMod, 'label-guide'],
  [scanMod, 'echo-scan'],
];

// Split visible text into sentences on `. `, `? `, `! ` and newlines, keeping the terminal punctuation with each
// sentence, then normalise: trim, lower case, collapse spaces. A sentence is dropped when it is shorter than 20
// characters or, after removing letters, holds only digits (a number, percent or code, never a real sentence).
function splitSentences(text) {
  return text
    .split(/[\r\n]+|(?<=[.?!])[\r\n ]+/)
    .map((s) => s.trim().toLowerCase().replace(/[ \t]+/g, ' '))
    .filter((s) => s.length >= 20 && !isNumberLike(s));
}

// True when, after removing every letter, only digits remain: a number, percent or code, not a sentence.
function isNumberLike(s) {
  const noLetters = s.replace(/[a-z]/g, '').replace(/[ \t]/g, '');
  return noLetters.length > 0 && /^\d+$/.test(noLetters);
}

// Visible text with a line break between elements, so two elements side by side never read as one sentence.
function textOf(node) {
  const parts = [];
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) parts.push(n.nodeValue);
  return parts.join('\n');
}

// The card name for a failure message: its first heading, else the start of its text.
function cardName(card) {
  const head = card.querySelector('h1, h2, h3, h4, strong');
  if (head) return head.textContent.trim().slice(0, 40);
  const clone = card.cloneNode(true);
  clone.querySelector('.help')?.remove();
  return textOf(clone).trim().slice(0, 40) || 'card';
}

// The first repeated normalised sentence, or null. Exported for a Node case so the split/dedupe rule is tested without a
// browser.
export function repeatedSentence(text) {
  const seen = new Map();
  for (const s of splitSentences(text)) {
    if (seen.has(s)) return s;
    seen.set(s, true);
  }
  return null;
}

if (typeof document === 'undefined') {
  skip('Data tab text is unique: captions stay in the block, no repeated sentence; store restored', 'browser only');
} else {
  test('Data tab text is unique: captions stay in the block, no repeated sentence; store restored', () => {
    const saved = {
      data: store.get().data,
      parseStats: store.get().parseStats,
      selection: store.get().selection,
      pair: store.get().pair,
      scanResult: store.get().scanResult,
      settings: store.get().settings,
    };
    const original = document.documentElement.getAttribute('data-theme');
    const host = document.createElement('section');
    const failures = [];
    try {
      const ctx = { config: app, version, modules: [], diag };
      for (const [mod, id] of MODULES) {
        const box = document.createElement('div');
        host.append(box);
        mod.mount(box, ctx);
      }
      // A card with a help block: the module-help cards plus the label naming guide card. The label glossary card has no
      // block, so it is not a target.
      const cards = [...host.querySelectorAll('section.card')].filter((c) => c.querySelector('.help'));
      for (const card of cards) {
        const heading = cardName(card);
        const toggle = card.querySelector('.help-toggle');

        // Rule 1: with the block closed, no caption word may appear in the text outside the block.
        const clone = card.cloneNode(true);
        clone.querySelector('.help').remove();
        const outside = clone.textContent;
        for (const caption of CAPTIONS) {
          if (outside.includes(caption)) {
            failures.push(`${heading}: caption "${caption}" outside the block (closed)`);
          }
        }

        // Rule 2: with the block open, no normalised sentence may occur twice in the card.
        toggle.click();
        const dup = repeatedSentence(textOf(card));
        if (dup) failures.push(`${heading}: repeated sentence "${dup.slice(0, 80)}" (open)`);
        toggle.click();
      }
    } finally {
      host.remove();
      store.set(saved);
      if (original === null) document.documentElement.removeAttribute('data-theme');
      else document.documentElement.setAttribute('data-theme', original);
    }
    assert.ok(failures.length === 0, failures.join('; '));
  });
}
