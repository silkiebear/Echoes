// Label naming guide (phase 4f.1): the Data tab card that explains the code at the end of a label. Text only; every
// string reaches the page through textContent. Categories are not listed here: they are read live from settings.
// Each "How to read this" part is limited by explore.help.maxChars (checked by label-guide.test.js).
export const labelGuide = {
  title: 'Label naming guide',
  ui: {
    toggle: 'How to read this',
    noCategories: 'There are no categories yet. Categories come from your settings file, which you load together with your export.',
  },
  captions: {
    what: 'What it shows',
    how: 'How to read it',
    numbers: 'Numbers',
    care: 'Be careful',
  },
  help: {
    what: 'A code at the end of a label groups the label by topic (its category) and can record whether you see the item as good or bad for you (its value mark). The codes are your own choice.',
    how: 'Read the format from left to right: the category first, then the optional subcategory, then the value mark. Type a label in the check field to see how Echoes reads it before you rename it in your tracker app.',
    numbers: 'The Label coding card counts labels as coded (the category is in your settings), possible code (the letter is not in your settings) or uncoded (no code at the end). This guide counts nothing.',
    care: 'Echoes counts and groups labels by code (see the Label coding card). The mark does not choose which results are tested. Labels without a code still work in every chart. Renaming a label in your tracker app does not change old entries unless you edit them.',
  },
  format: {
    template: '<name> <Category><sub><mark>',
    breakdown: 'The category is one capital letter or digit, such as F. The subcategory is optional and is one lowercase letter or digit, such as b. The value mark is one of the seven marks below.',
  },
  // Value marks in the order the parser reads them. The meaning is the user's own judgment, not a measurement.
  marks: [
    { mark: '++', meaning: 'very good for me' },
    { mark: '+', meaning: 'good' },
    { mark: '+-', meaning: 'mixed, mostly good' },
    { mark: '=', meaning: 'neutral' },
    { mark: '-+', meaning: 'mixed, mostly bad' },
    { mark: '-', meaning: 'bad' },
    { mark: '--', meaning: 'very bad' },
  ],
  examples: {
    caption: 'Examples',
    list: ['Late coffee Fb--', 'Walk Aa++', 'Nap S=', 'Quiet day M+', 'Gym A1+'],
    reading: 'category {category}, subcategory {sub}, value mark {mark}',
    none: 'none',
  },
  categories: {
    intro: 'Your categories, as your settings file lists them:',
  },
  check: {
    caption: 'Check a label',
    label: 'Type a label',
    placeholder: 'Late coffee Fb--',
    empty: 'Type a label to see how Echoes reads it.',
    fields: {
      name: 'Name',
      category: 'Category',
      sub: 'Subcategory',
      mark: 'Value mark',
      status: 'Status',
    },
    none: 'none',
    notListed: 'not in your settings',
    status: {
      coded: 'coded. Echoes counts this label as coded.',
      possible: 'possible code, not in registry. The letter is not one of your categories, so the label is not counted under a category.',
      uncoded: 'no code. Echoes reads the whole text as the name. The label still works in every chart.',
    },
  },
  glossary: {
    title: 'Words in this guide',
    terms: [
      { term: 'category', text: 'The one capital letter or digit at the start of a code. It names the topic, such as F for emotions. Your settings file lists the categories.' },
      { term: 'subcategory', text: 'The optional lowercase letter or digit after the category. It narrows the topic and can be left out.' },
      { term: 'value mark', text: 'The mark at the end of a code, from ++ (very good for me) to -- (very bad). It is your own judgment of the item.' },
    ],
  },
};
