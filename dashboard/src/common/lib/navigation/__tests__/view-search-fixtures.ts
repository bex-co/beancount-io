/** Values a `?view=` can carry that are not one of a page's views. */
export const cashFlowViewFixtures: unknown[] = [
  undefined,
  null,
  "",
  "nope",
  "NETCASHFLOW",
  "<script>",
  ["byActivity"],
  { view: "byActivity" },
  0,
  true,
];
