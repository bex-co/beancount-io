import {
  GROUP_UNSUBSCRIBE_URL,
  checkoutRecoveryEmailSubject,
  renderCheckoutRecoveryHtml,
  renderCheckoutRecoveryText,
  type CheckoutRecoveryEmailParams,
} from "../checkout-recovery.template";

const params: CheckoutRecoveryEmailParams = {
  tier: "Premium",
  plan: "Premium · Yearly",
  interval: "year",
  code: "K7QX2M9P",
  checkoutUrl: "https://checkout.stripe.com/r/live_example",
};

/** The body between the brand header and the footer separator. */
const bodyLines = (text: string) =>
  text
    .split("================")[1]
    .split("\n--\n")[0]
    .split("\n")
    .filter((line) => line.trim());

describe("checkout recovery email (ADR027 D7)", () => {
  it("names the plan in the subject", () => {
    expect(checkoutRecoveryEmailSubject(params)).toBe(
      "Your Premium plan is still waiting",
    );
  });

  it("says three things in the text body and nothing else", () => {
    expect(bodyLines(renderCheckoutRecoveryText(params))).toEqual([
      "You left Checkout before finishing — your Premium · Yearly plan is still saved.",
      "Use K7QX2M9P for 20% off your first year — it expires in 48 hours.",
      "Finish checkout: https://checkout.stripe.com/r/live_example",
    ]);
  });

  it("says the first month for a monthly plan", () => {
    expect(
      renderCheckoutRecoveryText({ ...params, interval: "month" }),
    ).toContain("20% off your first month");
  });

  it("gives an expiry in hours, never a date", () => {
    const text = renderCheckoutRecoveryText(params);
    expect(text).not.toMatch(
      /January|February|March|April|May|June|July|August|September|October|November|December/,
    );
  });

  it("links the checkout and the group unsubscribe in both parts", () => {
    const html = renderCheckoutRecoveryHtml(params);
    expect(html).toContain('href="https://checkout.stripe.com/r/live_example"');
    expect(html).toContain(`href="${GROUP_UNSUBSCRIBE_URL}"`);
    expect(renderCheckoutRecoveryText(params)).toContain(
      `Unsubscribe: ${GROUP_UNSUBSCRIBE_URL}`,
    );
  });

  it("carries no images and no tracking pixels", () => {
    expect(renderCheckoutRecoveryHtml(params)).not.toMatch(/<img\b/i);
  });

  it("escapes what it shows", () => {
    const html = renderCheckoutRecoveryHtml({ ...params, code: "<b>X</b>" });
    expect(html).toContain("&lt;b&gt;X&lt;/b&gt;");
  });

  it("refuses a script URL", () => {
    expect(() =>
      renderCheckoutRecoveryHtml({
        ...params,
        checkoutUrl: "javascript:alert(1)",
      }),
    ).toThrow();
  });
});
