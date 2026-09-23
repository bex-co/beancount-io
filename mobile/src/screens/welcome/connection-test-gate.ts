/**
 * Which connection test may still publish its result.
 *
 * A test is tied to the draft URL it started from. Editing the draft, restoring
 * the default, or starting another test makes every earlier test obsolete, so
 * a slow response for the old URL can never appear under the new one or
 * overwrite a newer test's loading state (w2/030). Pure, so the unit runner
 * can drive it without rendering the screen.
 */
export type ConnectionTestGate = {
  /** Begin a test; the token says whether it is still the current one. */
  start(): number;
  /** The draft changed: no in-flight test may publish. */
  invalidate(): void;
  isCurrent(token: number): boolean;
};

export function createConnectionTestGate(): ConnectionTestGate {
  let current = 0;
  return {
    start: () => ++current,
    invalidate: () => {
      current += 1;
    },
    isCurrent: (token) => token === current,
  };
}
