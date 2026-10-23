import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
} from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SubscriptionSection } from "../subscription-section";
import {
  MOCK_TIER_QUOTAS,
  mockNoSubscriptionData,
} from "./subscription-test-utils";

vi.mock("@/common/hooks/use-user-limits", () => ({
  useUserLimits: () => ({
    tier: "FREE",
    limits: { ledgersUsed: 1, ledgersMax: 1, collaboratorsPerLedgerMax: 1 },
    isLoading: false,
    error: undefined,
    refetch: vi.fn(),
  }),
}));
vi.mock("@/common/hooks/use-all-tier-quotas", () => ({
  useAllTierQuotas: () => ({ quotas: MOCK_TIER_QUOTAS, isLoading: false }),
}));

type UsageReply =
  | { aiCfoTokensUsed: number; aiCfoTokensMax: number }
  | "fail"
  | "hold";

/**
 * A client whose GetAiCfoUsage reads answer from `replies` in order; a held
 * read waits for `release`. The subscription read always succeeds.
 */
function billingClient(replies: UsageReply[]) {
  let usageReads = 0;
  let release: ((reply: UsageReply) => void) | null = null;
  const answer = (
    observer: {
      next: (value: unknown) => void;
      error: (e: unknown) => void;
      complete: () => void;
    },
    reply: UsageReply,
  ) => {
    if (reply === "fail") {
      observer.error(new Error("Failed to fetch"));
      return;
    }
    if (reply === "hold") {
      release = (next) => answer(observer, next);
      return;
    }
    observer.next({
      data: { aiCfoUsage: { __typename: "AiCfoUsage", ...reply } },
    });
    observer.complete();
  };
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      (operation) =>
        new Observable((observer) => {
          if (operation.operationName === "GetAiCfoUsage") {
            answer(observer, replies[usageReads++] ?? "fail");
            return;
          }
          if (operation.operationName === "GetSubscriptionStatus") {
            observer.next({ data: mockNoSubscriptionData });
            observer.complete();
            return;
          }
          observer.error(new Error(`unexpected ${operation.operationName}`));
        }),
    ),
  });
  return {
    client,
    usageReads: () => usageReads,
    release: (reply: UsageReply) => release?.(reply),
  };
}

const renderBilling = (client: ApolloClient) =>
  render(
    <ApolloProvider client={client}>
      <SubscriptionSection />
    </ApolloProvider>,
  );

const UNAVAILABLE = "Usage is unavailable right now.";

/**
 * A browser drops focus from the control it disables; jsdom keeps it there
 * (and `blur()` is a no-op on a disabled element), so lose it the way a
 * removed element does.
 */
function dropFocus() {
  const away = document.createElement("button");
  document.body.appendChild(away);
  away.focus();
  away.remove();
}

/** The AI Tokens block of the usage overview. */
const aiTokens = () =>
  within(screen.getByText("AI Tokens").closest(".space-y-2") as HTMLElement);

/**
 * A failed AI usage read shows no counts: Billing never invents a 0 / 0
 * allowance or a full exhausted gauge for it (w4/312).
 */
describe("Billing AI usage read failure", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("shows unavailable usage, keeps the plan, and recovers by keyboard retry", async () => {
    const user = userEvent.setup();
    const billing = billingClient(["fail", "hold", "hold"]);
    renderBilling(billing.client);

    expect(await screen.findByText(UNAVAILABLE)).toBeInTheDocument();
    // The successful subscription read still shows the plan.
    expect(screen.getByTestId("current-plan-banner")).toBeInTheDocument();
    expect(aiTokens().queryByText(/tokens used this month/)).toBeNull();
    expect(document.querySelector(".bg-destructive")).toBeNull();

    // A pending retry keeps the unavailable state in place, busy.
    const retry = aiTokens().getByRole("button", { name: "Try Again" });
    retry.focus();
    await user.keyboard("{Enter}");
    await waitFor(() => expect(billing.usageReads()).toBe(2));
    expect(retry).toBeDisabled();
    expect(screen.getByText(UNAVAILABLE)).toBeInTheDocument();
    expect(screen.getByTestId("current-plan-banner")).toBeInTheDocument();
    expect(aiTokens().queryByText(/tokens used this month/)).toBeNull();
    dropFocus();
    expect(document.body).toHaveFocus();

    // A repeated failure offers the retry again, focused for the next Enter.
    billing.release("fail");
    await waitFor(() => expect(retry).toBeEnabled());
    expect(screen.getByText(UNAVAILABLE)).toBeInTheDocument();
    expect(aiTokens().queryByText(/tokens used this month/)).toBeNull();
    expect(retry).toHaveFocus();

    await user.keyboard("{Enter}");
    await waitFor(() => expect(billing.usageReads()).toBe(3));
    dropFocus();
    billing.release({ aiCfoTokensUsed: 1234, aiCfoTokensMax: 50000 });

    expect(
      await screen.findByText("1,234 / 50,000 tokens used this month"),
    ).toBeInTheDocument();
    expect(screen.queryByText(UNAVAILABLE)).toBeNull();
    expect(screen.queryByRole("button", { name: "Try Again" })).toBeNull();
    // Focus lands on the usage that replaced the retry, not the page body.
    await waitFor(() =>
      expect(screen.getByText("AI Tokens").closest(".space-y-2")).toHaveFocus(),
    );
  });

  it("keeps counts an earlier read returned when a refresh fails", async () => {
    const billing = billingClient([
      { aiCfoTokensUsed: 40, aiCfoTokensMax: 50000 },
      "fail",
    ]);
    const first = renderBilling(billing.client);
    expect(
      await screen.findByText("40 / 50,000 tokens used this month"),
    ).toBeInTheDocument();
    first.unmount();

    // cache-and-network shows the cached read, then the refresh fails.
    renderBilling(billing.client);
    await waitFor(() => expect(billing.usageReads()).toBe(2));
    expect(
      await screen.findByText("40 / 50,000 tokens used this month"),
    ).toBeInTheDocument();
    expect(screen.queryByText(UNAVAILABLE)).toBeNull();
  });

  it.each([
    [
      "a genuine zero usage",
      { aiCfoTokensUsed: 0, aiCfoTokensMax: 50000 },
      "0 / 50,000 tokens used this month",
    ],
    [
      "an unlimited allowance",
      { aiCfoTokensUsed: 7, aiCfoTokensMax: -1 },
      "7 tokens used this month (Unlimited)",
    ],
  ])("shows %s as read", async (_label, reply, text) => {
    renderBilling(billingClient([reply]).client);
    expect(await screen.findByText(text)).toBeInTheDocument();
    expect(screen.queryByText(UNAVAILABLE)).toBeNull();
  });
});
