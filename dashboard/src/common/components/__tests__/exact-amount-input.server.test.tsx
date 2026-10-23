// @vitest-environment node
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

/**
 * Receipt Review and Add Budget render this field during SSR. Reading
 * HTMLInputElement when the module loaded threw there and forced React to
 * re-render the page on the client (w4/1021).
 */
describe("ExactAmountInput on the server", () => {
  it("loads and renders without a DOM", async () => {
    expect(typeof globalThis.HTMLInputElement).toBe("undefined");
    const { ExactAmountInput } = await import("../exact-amount-input");
    const html = renderToString(
      <ExactAmountInput aria-label="Amount" value="1" onChange={() => {}} />,
    );
    expect(html).toContain('type="number"');
    expect(html).toContain('value="1"');
  });
});
