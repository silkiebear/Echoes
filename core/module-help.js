// "How to read this" block of a Data or Tools module (phase 4f.3). It uses the same markup and group classes as the Explore
// blocks (core\explain-kit.js) but has no link to Explore's glossary: the module's own terms are in the glossary card.
// Text only: every string reaches the page through textContent.
import { exploreHelp } from '../config/explore-help.js';

const PARTS = ['what', 'how', 'numbers', 'care'];

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// A visible text of a module in one of the four groups (what, how, numbers, care): the caption word and the group tint and
// border. The text element is passed in, so a module can keep updating its text.
export function groupOf(kind, textNode) {
  const group = el('div', `grp grp-${kind}`);
  textNode.classList.add('grp-text');
  group.append(el('p', 'grp-caption', exploreHelp.captions[kind]), textNode);
  return group;
}

// The collapsed block for one module id (a key of exploreHelp.modules): four captioned parts, closed at first.
export function moduleHelp(moduleId) {
  const entry = exploreHelp.modules[moduleId];
  if (!entry) throw new Error(`module-help: no help for module ${moduleId}`);
  const block = el('div', 'help');
  const toggle = el('button', 'help-toggle', exploreHelp.ui.toggle);
  toggle.type = 'button';
  const body = el('div', 'help-body');
  for (const part of PARTS) {
    const group = el('div', `grp grp-${part}`);
    group.append(el('p', 'grp-caption', exploreHelp.captions[part]), el('p', 'grp-text', entry[part]));
    body.append(group);
  }
  let isOpen = false;
  const sync = () => {
    toggle.setAttribute('aria-expanded', String(isOpen));
    body.hidden = !isOpen;
  };
  toggle.addEventListener('click', () => {
    isOpen = !isOpen;
    sync();
  });
  sync();
  block.append(toggle, body);
  return block;
}
