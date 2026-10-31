import { afterEach, describe, expect, it } from "vitest";
import {
  forgetPendingApproval,
  rememberPendingApproval,
  takePendingApproval,
} from "../approval-return";

const pending = {
  invoiceId: "in_upgrade",
  amountCharged: 900,
  currency: "usd",
  priceId: "price_growth_monthly",
  returnTo: "/ledger/alice/books",
};

describe("pending bank approval", () => {
  afterEach(() => window.sessionStorage.clear());

  it("hands the change back once, for the PaymentIntent that returned", () => {
    rememberPendingApproval("pi_123_secret_abc", pending);

    expect(takePendingApproval("pi_123")).toEqual(pending);
    expect(takePendingApproval("pi_123")).toBeNull();
  });

  it("never hands a stale change to another PaymentIntent, and forgets it", () => {
    rememberPendingApproval("pi_old_secret_abc", pending);

    expect(takePendingApproval("pi_new")).toBeNull();
    expect(takePendingApproval("pi_old")).toBeNull();
  });

  it("drops a way back that leaves the site", () => {
    rememberPendingApproval("pi_123_secret_abc", {
      ...pending,
      returnTo: "https://evil.example/x",
    });

    expect(takePendingApproval("pi_123")?.returnTo).toBeNull();
  });

  it("forgets the change once the approval settled in place", () => {
    rememberPendingApproval("pi_123_secret_abc", pending);
    forgetPendingApproval();

    expect(takePendingApproval("pi_123")).toBeNull();
  });

  it("ignores an unreadable entry", () => {
    window.sessionStorage.setItem("beancount.billing.approval", "{not json");

    expect(takePendingApproval("pi_123")).toBeNull();
  });
});
