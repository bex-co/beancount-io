// @vitest-environment node
import { renderToString } from "react-dom/server";
import { beforeAll, describe, expect, it } from "vitest";

/**
 * Receipt Review and Add Budget render this field during SSR. Reading
 * HTMLInputElement when the module loaded threw there and forced React to
 * re-render the page on the client (w4/1021).
 */
describe("ExactAmountInput on the server", () => {
  let ExactAmountInput: typeof import("../exact-amount-input").ExactAmountInput;

  // Loading it is the first check. Since w2/120 it brings the translation
  // stack, which under the full suite's parallel load takes more than the
  // default 10s, so the load has its own budget.
  beforeAll(async () => {
    expect(typeof globalThis.HTMLInputElement).toBe("undefined");
    ({ ExactAmountInput } = await import("../exact-amount-input"));
  }, 60_000);

  it("loads and renders without a DOM", () => {
    const html = renderToString(
      <ExactAmountInput aria-label="Amount" value="1" onChange={() => {}} />,
    );
    // A text field the dashboard parses, not the browser (w2/120).
    expect(html).toContain('type="text"');
    expect(html).toContain('inputMode="decimal"');
    expect(html).toContain('value="1"');
  });
});
