// Data tab: the label naming guide (phase 4f.1). It explains the code at the end of a label, lists the categories read
// live from settings, and checks a typed label with the reader the Label coding card uses. Text only: every string goes
// through textContent, and a typed label is registered with diag by readLabel before it is shown.
import { labelGuide } from '../config/label-guide.js';
import { readLabel } from '../core/label-code.js';
import * as diag from '../core/diag.js';
import * as store from '../core/store.js';

const PARTS = ['what', 'how', 'numbers', 'care'];
const CHECK_FIELDS = ['name', 'category', 'sub', 'mark', 'status'];

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function fill(template, values) {
  return template.replace(/\{(\w+)\}/g, (_, key) => values[key]);
}

function currentCategories() {
  return store.get().settings?.categories ?? [];
}

// Categories as the guide lists them. Names come from the user's settings, so each one is registered with diag as it is read.
export function guideCategories(categories) {
  return categories.map(({ code, name }) => {
    diag.register(name, 'label');
    return { code, name };
  });
}

// The collapsed "How to read this" block: four captioned parts with the group classes the Explore blocks use.
function helpBlock() {
  const block = el('div', 'help');
  const toggle = el('button', 'help-toggle', labelGuide.ui.toggle);
  toggle.type = 'button';
  const body = el('div', 'help-body');
  for (const part of PARTS) {
    const group = el('div', `grp grp-${part}`);
    group.append(el('p', 'grp-caption', labelGuide.captions[part]), el('p', 'grp-text', labelGuide.help[part]));
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

// The template, the breakdown, the seven marks and five worked examples read from the parser.
function formatGroup(categories) {
  const group = el('div', 'grp grp-how');
  group.append(
    el('p', 'grp-caption', labelGuide.captions.how),
    el('p', 'grp-text', labelGuide.format.template),
    el('p', 'grp-text', labelGuide.format.breakdown),
  );
  const marks = el('dl', 'glossary');
  for (const { mark, meaning } of labelGuide.marks) marks.append(el('dt', null, mark), el('dd', null, meaning));
  const examples = el('ul', 'label-list');
  for (const text of labelGuide.examples.list) {
    const read = readLabel(text, categories);
    const reading = fill(labelGuide.examples.reading, {
      category: read.category ?? labelGuide.examples.none,
      sub: read.sub ?? labelGuide.examples.none,
      mark: read.mark ?? labelGuide.examples.none,
    });
    examples.append(el('li', null, `${text}: ${reading}`));
  }
  group.append(el('p', 'grp-caption', labelGuide.examples.caption), marks, examples);
  return group;
}

// The checker: a typed label, read the way the Label coding card reads it, in plain words.
function checkGroup() {
  const group = el('div', 'grp grp-check');
  const input = el('input', 'explore-input');
  input.type = 'text';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.placeholder = labelGuide.check.placeholder;
  const field = el('label', 'field-label', labelGuide.check.label);
  field.append(input);
  const note = el('p', 'data-note', labelGuide.check.empty);
  const result = el('dl', 'glossary');
  result.hidden = true;
  group.append(el('p', 'grp-caption', labelGuide.check.caption), field, note, result);

  function show(list) {
    result.replaceChildren();
    if (input.value.trim() === '') {
      note.hidden = false;
      result.hidden = true;
      return;
    }
    const read = readLabel(input.value, list);
    const cat = list.find((c) => c.code === read.category);
    const categoryText = read.category === null ? labelGuide.check.none
      : `${read.category} (${cat ? cat.name : labelGuide.check.notListed})`;
    const mark = labelGuide.marks.find((m) => m.mark === read.mark);
    const values = {
      name: read.name,
      category: categoryText,
      sub: read.sub ?? labelGuide.check.none,
      mark: mark ? `${mark.mark} (${mark.meaning})` : labelGuide.check.none,
      status: labelGuide.check.status[read.status],
    };
    for (const key of CHECK_FIELDS) {
      result.append(el('dt', null, labelGuide.check.fields[key]), el('dd', null, values[key]));
    }
    note.hidden = true;
    result.hidden = false;
  }

  input.addEventListener('input', () => show(guideCategories(currentCategories())));
  return { node: group, show };
}

export default {
  id: 'label-guide',
  title: labelGuide.title,
  phase: 4,
  order: 15.5,
  mount(container) {
    const card = el('section', 'card');
    const categoryGroup = el('div', 'grp grp-what');
    const check = checkGroup();
    card.append(helpBlock(), formatGroup(currentCategories()), categoryGroup, check.node);

    const glossary = el('section', 'card');
    const terms = el('dl', 'glossary');
    for (const { term, text } of labelGuide.glossary.terms) terms.append(el('dt', null, term), el('dd', null, text));
    glossary.append(el('p', 'grp-caption', labelGuide.glossary.title), terms);
    container.append(card, glossary);

    function render(state) {
      const list = guideCategories(state.settings?.categories ?? []);
      categoryGroup.replaceChildren(el('p', 'grp-caption', labelGuide.captions.what), el('p', 'grp-text', labelGuide.categories.intro));
      if (list.length === 0) {
        categoryGroup.append(el('p', 'grp-text', labelGuide.ui.noCategories));
      } else {
        const items = el('ul', 'label-list');
        items.append(...list.map(({ code, name }) => el('li', null, `${code}  ${name}`)));
        categoryGroup.append(items);
      }
      check.show(list);
    }

    const unsubscribe = store.subscribe((state) => {
      if (!container.isConnected) {
        unsubscribe();
        return;
      }
      render(state);
    });
    render(store.get());
  },
};
