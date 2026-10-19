// Explore: the glossary card (phase 4e, 4e.1). It is the first card of the Explore tab; the other cards name its terms in
// their "How to read this" blocks. Text only: every string reaches the page through textContent.
import { exploreHelp } from '../config/explore-help.js';
import { cardHelp } from '../core/explain-kit.js';

// Help ids of the cards in this module (checked by explore-help.test.js).
export const cardIds = ['glossary'];

export default {
  id: 'explore-help',
  title: exploreHelp.glossary.title,
  phase: 4,
  order: 16,
  mount(container) {
    // The tab shows the module title as the card heading already, so this card has no heading of its own.
    const card = document.createElement('section');
    card.className = 'card';
    const list = document.createElement('dl');
    list.className = 'glossary';
    for (const { term, text } of exploreHelp.glossary.terms) {
      const dt = document.createElement('dt');
      dt.textContent = term;
      const dd = document.createElement('dd');
      dd.textContent = text;
      list.append(dt, dd);
    }
    card.append(cardHelp('glossary').help, list);
    container.append(card);
  },
};
