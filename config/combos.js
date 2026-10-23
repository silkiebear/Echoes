// Tunables for the label combination views (phase 4h): the Days together card (C1) and the later combination cards.
// coMax: most labels one co-occurrence matrix holds. Choice: the same as the Explore selection maximum (explore.selection.max),
// so every selection fits and the matrix stays readable at 320 px.
// comboMax: most labels in one combination. Choice: 6, so the number of combinations stays small enough to count by hand.
// levels: number of shade steps in the matrix. Each step has one CSS class (co-0 to co-4) and one colour token (--co-1 to --co-5).
export const combos = {
  coMax: 8,
  comboMax: 6,
  levels: 5,
};
