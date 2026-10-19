// "How to read this" block and the "In this chart" line of an Explore card (phase 4e, 4e.1). DOM helpers: all text goes
// through textContent. The open state of a block is kept per card for this session only; a reload closes every block.
import { exploreHelp } from '../config/explore-help.js';

const PARTS = ['what', 'how', 'numbers', 'care'];
const openCards = new Map();

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// Collapsed block: a 44 px toggle, then four captioned parts in the order what, how, numbers, care.
export function helpBlock(host, entry, glossaryName) {
  const block = el('div', 'help');
  const toggle = el('button', 'help-toggle', exploreHelp.ui.toggle);
  toggle.type = 'button';
  const body = el('div', 'help-body');
  body.append(el('p', 'help-link', exploreHelp.ui.glossaryLink.replace('{name}', glossaryName)));
  for (const part of PARTS) {
    const group = el('div', `grp grp-${part}`);
    group.append(el('p', 'grp-caption', exploreHelp.captions[part]), el('p', 'grp-text', entry[part]));
    body.append(group);
  }
  let isOpen = openCards.get(entry.id) === true;
  const sync = () => {
    toggle.setAttribute('aria-expanded', String(isOpen));
    body.hidden = !isOpen;
  };
  toggle.addEventListener('click', () => {
    isOpen = !isOpen;
    openCards.set(entry.id, isOpen);
    sync();
  });
  sync();
  block.append(toggle, body);
  host.append(block);
  return block;
}

// "In this chart": hidden until a card has a sentence to show (an empty sentence hides it again).
export function liveLine() {
  const block = el('div', 'explain-live');
  const text = el('p', 'explain-live-text');
  block.append(el('p', 'explain-live-caption', exploreHelp.live.caption), text);
  block.hidden = true;
  return {
    node: block,
    say(sentence) {
      text.textContent = sentence;
      block.hidden = sentence === '';
    },
  };
}

// The help block and the live line of one card, by card id (a key of exploreHelp.cards).
export function cardHelp(cardId) {
  const entry = exploreHelp.cards[cardId];
  if (!entry) throw new Error(`explain-kit: no help for card ${cardId}`);
  const host = el('div');
  helpBlock(host, entry, exploreHelp.glossary.title);
  const live = liveLine();
  return { help: host.firstElementChild, live: live.node, say: live.say };
}
