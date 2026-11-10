/** "1 entry", "2 entries": a delete of one entry read "1 entries" (w1/226). */
export function entryCount(count: number): string {
  return `${count} ${count === 1 ? "entry" : "entries"}`;
}
