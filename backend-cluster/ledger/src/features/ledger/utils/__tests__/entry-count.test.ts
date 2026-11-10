import { entryCount } from "@/features/ledger/utils/entry-count";

// w1/226: a delete of one entry previewed "Would delete 1 entries".
it.each([
  [0, "0 entries"],
  [1, "1 entry"],
  [2, "2 entries"],
])("counts %p as %p", (count, words) => {
  expect(entryCount(count)).toBe(words);
});
