import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlanChangeSheet } from "../plan-change-sheet";
import {
  rememberPendingApproval,
  takePendingApproval,
} from "@/features/user-settings/lib/approval-return";
import { MOCK_TIER_QUOTAS } from "./subscription-test-utils";

const {
  mockRunPreview,
  mockChangePlan,
  mockRefetchPlan,
  mockApproveBankPayment,
  mockPreview,
  mockTrack,
  mockToast,
  mockCelebrate,
} = vi.hoisted(() => ({
  mockTrack: vi.fn(),
  mockCelebrate: vi.fn(),
  mockToast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(() => "waiting"),
    dismiss: vi.fn(),
  },
  mockRunPreview: vi.fn(),
  mockChangePlan: vi.fn(),
  mockRefetchPlan: vi.fn(),
  mockApproveBankPayment: vi.fn(),
  mockPreview: {
    state: { data: undefined, loading: false, error: undefined } as {
      data: unknown;
      loading: boolean;
      error: unknown;
    },
    // A split's second preview: the higher tier now, on yearly.
    alternative: { data: undefined, loading: false, error: undefined } as {
      data: unknown;
      loading: boolean;
      error: unknown;
    },
    instances: 0,
  },
}));

vi.mock("@/features/user-settings/hooks/use-plan-change", async () => {
  const React = await import("react");
  return {
    // The sheet's first preview hook is the change; its second, the
    // alternative a split offers.
    usePreviewPlanChange: () => {
      const [index] = React.useState(() => mockPreview.instances++);
      return [
        mockRunPreview,
        index % 2 === 0 ? mockPreview.state : mockPreview.alternative,
      ];
    },
    useChangePlan: () => [
      mockChangePlan,
      { loading: false, refetchPlan: mockRefetchPlan },
    ],
  };
});
vi.mock("../bank-approval", () => ({
  approveBankPayment: mockApproveBankPayment,
}));
vi.mock("sonner", () => ({ toast: mockToast }));
vi.mock("@/features/user-settings/lib/celebrate", () => ({
  celebrate: mockCelebrate,
}));
vi.mock("@/common/analytics", () => ({ track: mockTrack }));
vi.mock("@/common/lib/errors/error-message", () => ({
  useErrorMessage: () => () => "error",
}));
vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string) => key,
    i18n: { language: "en" },
  }),
}));

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key} ${Object.values(params).join(" ")}` : key;
const GROWTH_YEARLY = "price_1SyPdbEqsEqs2tLV7PJyWZed";
const quotaByUserTier = Object.fromEntries(
  MOCK_TIER_QUOTAS.map((quota) => [quota.tier, quota]),
);

function preview(overrides: Record<string, unknown> = {}) {
  return {
    previewPlanChange: {
      kind: "TO_YEARLY",
      refusal: null,
      effect: "IMMEDIATE",
      currentPriceId: "price_1RrSOGEqsEqs2tLVFnyB34qG",
      targetPriceId: GROWTH_YEARLY,
      currency: "usd",
      amountDueToday: 95_000,
      creditApplied: 999,
      nextAmount: 95_988,
      nextChargeAt: "2027-10-17T12:00:00Z",
      effectiveAt: "2026-10-17T12:00:00Z",
      prorationDate: 1792238400,
      alternativePriceId: null,
      limitChanges: [],
      paymentMethod: { brand: "visa", last4: "4242" },
      ...overrides,
    },
  };
}

function renderSheet(
  props: Partial<Parameters<typeof PlanChangeSheet>[0]> = {},
) {
  const handlers = {
    onClose: vi.fn(),
    onCheckout: vi.fn(),
    onManageBilling: vi.fn(),
    onChanged: vi.fn(),
  };
  render(
    <PlanChangeSheet
      target={{ tier: "growth", cycle: "yearly", surface: "settings_billing" }}
      currentTier="PREMIUM"
      currentCycle="monthly"
      currentPlanLabel="Premium · Monthly"
      quotaByUserTier={quotaByUserTier}
      t={t}
      {...handlers}
      {...props}
    />,
  );
  return handlers;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPreview.instances = 0;
  mockPreview.alternative = {
    data: undefined,
    loading: false,
    error: undefined,
  };
  mockPreview.state = { data: preview(), loading: false, error: undefined };
  // Like Apollo's lazy query: the promise resolves with the response.
  mockRunPreview.mockImplementation(async () => ({
    data: mockPreview.state.data,
  }));
  mockRefetchPlan.mockResolvedValue({});
});

describe("PlanChangeSheet", () => {
  it("previews the target price as soon as it opens", () => {
    renderSheet();
    expect(mockRunPreview).toHaveBeenCalledWith({
      variables: { clientId: "beancount-web-prod", priceId: GROWTH_YEARLY },
    });
  });

  it("shows the charge, the credit, the next charge, the card and what the plan adds", () => {
    renderSheet();

    expect(screen.getByText("$950.00")).toBeInTheDocument();
    expect(
      screen.getByText("userSettings.planChangeCredit $9.99"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/userSettings\.planChangeNext \$959\.88/),
    ).toBeInTheDocument();
    expect(
      screen.getByText("userSettings.planChangeChargedTo visa •••• 4242"),
    ).toBeInTheDocument();
    // Premium → Growth adds ledgers, collaborators, tokens and automation.
    expect(
      screen.getByText("userSettings.featureAutomationIntegrations"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("userSettings.featureAutomaticBackups"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "userSettings.planChangePayAndSwitch $950.00",
      }),
    ).toBeInTheDocument();
  });

  it("hands a new subscription to Checkout instead of changing a plan", async () => {
    const user = userEvent.setup();
    mockPreview.state = {
      data: preview({ kind: "NEW", effect: "CHECKOUT", prorationDate: null }),
      loading: false,
      error: undefined,
    };
    const { onCheckout } = renderSheet({ currentTier: "FREE" });

    await user.click(
      screen.getByRole("button", {
        name: "userSettings.planChangeContinueToCheckout",
      }),
    );
    expect(onCheckout).toHaveBeenCalledWith({
      tier: "growth",
      cycle: "yearly",
      surface: "settings_billing",
    });
    expect(mockChangePlan).not.toHaveBeenCalled();
  });

  it.each([
    ["CURRENT_PLAN", "userSettings.planChangeRefusalCurrent"],
    ["SAME_TIER_AND_CYCLE", "userSettings.planChangeRefusalSameTier"],
    ["MULTIPLE_SUBSCRIPTIONS", "userSettings.planChangeRefusalMultiple"],
    ["PAST_DUE", "userSettings.planChangeRefusalPastDue"],
  ])("explains the %s refusal and offers no confirm", (refusal, message) => {
    mockPreview.state = {
      data: preview({ kind: null, effect: null, refusal }),
      loading: false,
      error: undefined,
    };
    renderSheet();

    expect(screen.getByText(message)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /planChangePayAndSwitch/ }),
    ).not.toBeInTheDocument();
  });

  it("offers a retry when the price cannot be loaded", async () => {
    const user = userEvent.setup();
    mockPreview.state = {
      data: undefined,
      loading: false,
      error: new Error("boom"),
    };
    renderSheet();

    expect(
      screen.getByText("userSettings.planChangePreviewFailed"),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "common.tryAgain" }));
    expect(mockRunPreview).toHaveBeenCalledTimes(2);
  });

  it("ignores a stale preview for a different price", () => {
    mockPreview.state = {
      data: preview({ targetPriceId: "price_other" }),
      loading: false,
      error: undefined,
    };
    renderSheet();
    expect(
      screen.getByText("userSettings.planChangePreviewing"),
    ).toBeInTheDocument();
  });

  it("renders nothing when closed", () => {
    const { container } = render(
      <PlanChangeSheet
        target={null}
        currentTier="PREMIUM"
        currentCycle={null}
        currentPlanLabel=""
        quotaByUserTier={quotaByUserTier}
        t={t}
        onClose={vi.fn()}
        onCheckout={vi.fn()}
        onManageBilling={vi.fn()}
        onChanged={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
    expect(mockRunPreview).not.toHaveBeenCalled();
  });

  it("cannot confirm again while a Checkout is being created", () => {
    mockPreview.state = {
      data: preview({ kind: "NEW", effect: "CHECKOUT", prorationDate: null }),
      loading: false,
      error: undefined,
    };
    renderSheet({
      currentTier: "FREE",
      currentCycle: null,
      checkoutPending: true,
    });
    expect(
      screen.getByRole("button", {
        name: "userSettings.planChangeContinueToCheckout",
      }),
    ).toBeDisabled();
  });

  describe("analytics", () => {
    const CHANGE = {
      kind: "TO_YEARLY",
      from: "premium_monthly",
      to: "growth_yearly",
      surface: "settings_billing",
    };
    const events = (name: string) =>
      mockTrack.mock.calls.filter(([event]) => event === name);
    const sheet = () => (
      <PlanChangeSheet
        target={{
          tier: "growth",
          cycle: "yearly",
          surface: "settings_billing",
        }}
        currentTier="PREMIUM"
        currentCycle="monthly"
        currentPlanLabel="Premium · Monthly"
        quotaByUserTier={quotaByUserTier}
        t={t}
        onClose={vi.fn()}
        onCheckout={vi.fn()}
        onManageBilling={vi.fn()}
        onChanged={vi.fn()}
      />
    );

    it("reports each preview response once, with the plans and surface", async () => {
      const { rerender } = render(sheet());
      await waitFor(() =>
        expect(events("plan_change_previewed")).toEqual([
          ["plan_change_previewed", CHANGE],
        ]),
      );
      rerender(sheet());
      expect(mockRunPreview).toHaveBeenCalledTimes(1);
      expect(events("plan_change_previewed")).toHaveLength(1);
    });

    it("counts a retried preview again", async () => {
      const user = userEvent.setup();
      mockPreview.state = {
        data: undefined,
        loading: false,
        error: new Error("boom"),
      };
      renderSheet();
      mockRunPreview.mockResolvedValueOnce({ data: preview() });
      await user.click(screen.getByRole("button", { name: "common.tryAgain" }));
      await waitFor(() =>
        expect(events("plan_change_previewed")).toEqual([
          ["plan_change_previewed", CHANGE],
        ]),
      );
    });

    it("does not report a refused preview", async () => {
      mockPreview.state = {
        data: preview({ kind: null, refusal: "CURRENT_PLAN" }),
        loading: false,
        error: undefined,
      };
      renderSheet();
      await waitFor(() => expect(mockRunPreview).toHaveBeenCalled());
      await Promise.resolve();
      expect(events("plan_change_previewed")).toEqual([]);
    });

    it("names the tier alone without a current subscription", async () => {
      mockPreview.state = {
        data: preview({
          kind: "NEW",
          effect: "CHECKOUT",
          currentPriceId: null,
        }),
        loading: false,
        error: undefined,
      };
      renderSheet({ currentTier: "FREE", currentCycle: null });
      await waitFor(() =>
        expect(events("plan_change_previewed")[0]?.[1]).toMatchObject({
          kind: "NEW",
          from: "free",
        }),
      );
    });

    it.each([
      ["ACTIVE", { status: "ACTIVE" }, []],
      [
        "REQUIRES_ACTION",
        { status: "REQUIRES_ACTION", hostedInvoiceUrl: null },
        ["payment_action_required"],
      ],
      ["FAILED", { status: "FAILED" }, ["payment_action_failed"]],
      // No result is not a decline.
      ["missing", null, []],
    ])(
      "reports the confirm and a %s result",
      async (_label, changePlan, outcomeEvents) => {
        const user = userEvent.setup();
        mockChangePlan.mockResolvedValue({ data: { changePlan } });
        renderSheet();

        await user.click(
          screen.getByRole("button", {
            name: "userSettings.planChangePayAndSwitch $950.00",
          }),
        );

        expect(events("plan_change_confirmed")).toEqual([
          ["plan_change_confirmed", CHANGE],
        ]);
        expect(
          mockTrack.mock.calls
            .map(([event]) => event as string)
            .filter((event) => event.startsWith("payment_action")),
        ).toEqual(outcomeEvents);
      },
    );
  });

  describe("a payment the bank must approve", () => {
    const requiresAction = (overrides: Record<string, unknown> = {}) => ({
      data: {
        changePlan: {
          status: "REQUIRES_ACTION",
          clientSecret: "pi_secret",
          hostedInvoiceUrl: "https://invoice.stripe.com/i/in_1",
          ...overrides,
        },
      },
    });
    const confirm = async () => {
      const user = userEvent.setup();
      await user.click(
        screen.getByRole("button", {
          name: "userSettings.planChangePayAndSwitch $950.00",
        }),
      );
    };
    const paymentEvents = () =>
      mockTrack.mock.calls
        .map(([event]) => event as string)
        .filter((event) => event.startsWith("payment_action"));

    it("approves it in place, then refetches the plan and reports the change", async () => {
      mockChangePlan.mockResolvedValue(requiresAction());
      mockApproveBankPayment.mockResolvedValue("approved");
      const { onClose } = renderSheet({ returnTo: "/ledger" });

      await confirm();

      expect(mockApproveBankPayment).toHaveBeenCalledWith(
        "pi_secret",
        `${window.location.origin}/settings/billing`,
      );
      await waitFor(() => expect(onClose).toHaveBeenCalled());
      expect(mockRefetchPlan).toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalledWith(
        "userSettings.subscriptionUpgraded",
        expect.objectContaining({
          action: expect.objectContaining({
            label: "userSettings.backToWork",
          }),
        }),
      );
      expect(paymentEvents()).toEqual([
        "payment_action_required",
        "payment_action_completed",
      ]);
    });

    it("steps aside while the bank's challenge is open, so Stripe can take the pointer", async () => {
      mockChangePlan.mockResolvedValue(requiresAction());
      let settle: (approval: string) => void = () => {};
      mockApproveBankPayment.mockReturnValue(
        new Promise((resolve) => {
          settle = resolve;
        }),
      );
      renderSheet();

      await confirm();

      await waitFor(() =>
        expect(screen.queryByTestId("plan-change-sheet")).toBeNull(),
      );
      expect(mockToast.loading).toHaveBeenCalledWith(
        "userSettings.planChangeApproving",
      );
      settle("declined");
      expect(
        await screen.findByText("userSettings.planChangeFailed"),
      ).toBeInTheDocument();
      expect(mockToast.dismiss).toHaveBeenCalledWith("waiting");
    });

    const purchases = () =>
      mockTrack.mock.calls.filter(([event]) => event === "purchase");

    it("remembers the change while the bank approves it, in case it redirects", async () => {
      mockChangePlan.mockResolvedValue(
        requiresAction({
          clientSecret: "pi_redirect_secret_abc",
          invoiceId: "in_redirect",
          amountCharged: 95000,
          currency: "usd",
        }),
      );
      let remembered: unknown = null;
      mockApproveBankPayment.mockImplementation(async () => {
        remembered = takePendingApproval("pi_redirect");
        rememberPendingApproval("pi_redirect_secret_abc", {
          invoiceId: null,
          amountCharged: null,
          currency: null,
          priceId: "price",
          returnTo: null,
        });
        return "pending";
      });
      renderSheet({ returnTo: "/ledger" });

      await confirm();

      await screen.findByTestId("plan-change-action");
      expect(remembered).toEqual(
        expect.objectContaining({
          invoiceId: "in_redirect",
          amountCharged: 95000,
          currency: "usd",
          returnTo: "/ledger",
        }),
      );
      // Settled in place: nothing is left to announce on a later visit.
      expect(takePendingApproval("pi_redirect")).toBeNull();
    });

    it("counts the approved charge as one purchase and celebrates it", async () => {
      mockChangePlan.mockResolvedValue(
        requiresAction({
          invoiceId: "in_approved",
          amountCharged: 95000,
          currency: "usd",
        }),
      );
      mockApproveBankPayment.mockResolvedValue("approved");
      const { onClose } = renderSheet();

      await confirm();

      await waitFor(() => expect(onClose).toHaveBeenCalled());
      expect(purchases()).toEqual([
        [
          "purchase",
          expect.objectContaining({
            transaction_id: "in_approved",
            value: 950,
            currency: "USD",
          }),
        ],
      ]);
      expect(mockCelebrate).toHaveBeenCalledTimes(1);
    });

    it("counts and celebrates nothing when the bank refuses", async () => {
      mockChangePlan.mockResolvedValue(
        requiresAction({
          invoiceId: "in_refused",
          amountCharged: 95000,
          currency: "usd",
        }),
      );
      mockApproveBankPayment.mockResolvedValue("declined");
      renderSheet();

      await confirm();

      expect(
        await screen.findByText("userSettings.planChangeFailed"),
      ).toBeInTheDocument();
      expect(purchases()).toEqual([]);
      expect(mockCelebrate).not.toHaveBeenCalled();
    });

    it("counts a change that took effect at no charge at value 0, and celebrates it", async () => {
      mockChangePlan.mockResolvedValue({
        data: {
          changePlan: {
            status: "ACTIVE",
            invoiceId: "in_credit",
            amountCharged: 0,
            currency: "usd",
          },
        },
      });
      const { onClose } = renderSheet();

      await confirm();

      await waitFor(() => expect(onClose).toHaveBeenCalled());
      expect(purchases()).toEqual([
        [
          "purchase",
          expect.objectContaining({ transaction_id: "in_credit", value: 0 }),
        ],
      ]);
      expect(mockCelebrate).toHaveBeenCalledTimes(1);
    });

    it("celebrates a change that took effect without an invoice, counting no purchase", async () => {
      mockChangePlan.mockResolvedValue({
        data: { changePlan: { status: "ACTIVE" } },
      });
      const { onClose } = renderSheet();

      await confirm();

      await waitFor(() => expect(onClose).toHaveBeenCalled());
      expect(purchases()).toEqual([]);
      expect(mockCelebrate).toHaveBeenCalledTimes(1);
    });

    it("says nothing changed when the bank refuses, and offers another card", async () => {
      mockChangePlan.mockResolvedValue(requiresAction());
      mockApproveBankPayment.mockResolvedValue("declined");
      renderSheet();

      await confirm();

      expect(
        await screen.findByText("userSettings.planChangeFailed"),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", {
          name: "userSettings.planChangeUseAnotherCard",
        }),
      ).toBeInTheDocument();
      expect(mockRefetchPlan).not.toHaveBeenCalled();
      expect(mockToast.success).not.toHaveBeenCalled();
      expect(paymentEvents()).toEqual([
        "payment_action_required",
        "payment_action_failed",
      ]);
    });

    it.each(["unavailable", "pending"])(
      "falls back to Stripe's page when the approval is %s",
      async (approval) => {
        mockChangePlan.mockResolvedValue(requiresAction());
        mockApproveBankPayment.mockResolvedValue(approval);
        renderSheet();

        await confirm();

        expect(
          await screen.findByRole("link", {
            name: "userSettings.planChangeApprovePayment",
          }),
        ).toHaveAttribute("href", "https://invoice.stripe.com/i/in_1");
        expect(mockToast.success).not.toHaveBeenCalled();
      },
    );

    it("goes straight to Stripe's page without a client secret", async () => {
      mockChangePlan.mockResolvedValue(requiresAction({ clientSecret: null }));
      renderSheet();

      await confirm();

      expect(
        await screen.findByRole("link", {
          name: "userSettings.planChangeApprovePayment",
        }),
      ).toBeInTheDocument();
      expect(mockApproveBankPayment).not.toHaveBeenCalled();
    });
  });

  describe("changes that wait for the end of the paid period", () => {
    const PREMIUM_YEARLY = "price_1US5htEqsEqs2tLVENCzLaZB";
    const PREMIUM_MONTHLY = "price_1RrSOGEqsEqs2tLVFnyB34qG";
    const GROWTH_MONTHLY = "price_1SyPdaEqsEqs2tLViLPUDoVi";
    const scheduled = (overrides: Record<string, unknown> = {}) =>
      preview({
        kind: "DOWNGRADE",
        effect: "SCHEDULED",
        currentPriceId: GROWTH_YEARLY,
        targetPriceId: PREMIUM_YEARLY,
        amountDueToday: 0,
        creditApplied: 0,
        nextAmount: 9999,
        prorationDate: null,
        effectiveAt: "2027-10-17T12:00:00Z",
        nextChargeAt: "2027-10-17T12:00:00Z",
        limitChanges: [
          { limit: "maxLedgers", from: 20, to: 5 },
          { limit: "maxCollaboratorsPerLedger", from: 10, to: 5 },
          { limit: "aiCfoTokensMax", from: 2_000_000, to: 500_000 },
          { limit: "maxDirectives", from: -1, to: -1 },
        ],
        ...overrides,
      });
    const show = (data: unknown) => {
      mockPreview.state = { data, loading: false, error: undefined };
    };
    const downgrade = (ledgersUsed: number | null) =>
      renderSheet({
        target: {
          tier: "premium",
          cycle: "yearly",
          surface: "settings_billing",
        },
        currentTier: "GROWTH",
        currentCycle: "yearly",
        ledgersUsed,
      });

    it("shows the date, nothing due, and each limit against usage, warning when over", () => {
      show(scheduled());
      downgrade(12);

      const body = within(screen.getByTestId("plan-change-scheduled"));
      expect(
        body.getByText(/^userSettings\.planChangeStartsOn/),
      ).toBeInTheDocument();
      expect(
        body.getByText(/userSettings\.planChangeNothingToday/),
      ).toBeInTheDocument();
      // Ledgers 20 → 5 with 12 used, collaborators 10 → 5, tokens 2M → 500K.
      expect(body.getByText("20 → 5")).toBeInTheDocument();
      expect(body.getByText("10 → 5")).toBeInTheDocument();
      expect(body.getByText("2,000,000 → 500,000")).toBeInTheDocument();
      expect(
        body.getByText("userSettings.featureAutomationIntegrations"),
      ).toBeInTheDocument();
      expect(body.getByRole("note")).toHaveTextContent(
        "userSettings.planChangeOverLimit",
      );
      expect(
        body.getByRole("button", {
          name: "userSettings.planChangeScheduleDowngrade",
        }),
      ).toBeInTheDocument();
      expect(
        body.getByRole("button", { name: /^userSettings\.planChangeKeep/ }),
      ).toBeInTheDocument();
    });

    it("warns about nothing when usage fits the lower plan", () => {
      show(scheduled());
      downgrade(3);
      expect(
        within(screen.getByTestId("plan-change-scheduled")).queryByRole("note"),
      ).not.toBeInTheDocument();
    });

    it("schedules the change with nothing charged, then says when it lands", async () => {
      const user = userEvent.setup();
      show(scheduled());
      mockChangePlan.mockResolvedValue({
        data: {
          changePlan: {
            status: "SCHEDULED",
            effectiveAt: "2027-10-17T12:00:00Z",
          },
        },
      });
      const { onChanged, onClose } = downgrade(3);

      await user.click(
        screen.getByRole("button", {
          name: "userSettings.planChangeScheduleDowngrade",
        }),
      );

      expect(mockChangePlan).toHaveBeenCalledWith({
        variables: {
          clientId: "beancount-web-prod",
          priceId: PREMIUM_YEARLY,
          prorationDate: null,
        },
      });
      await waitFor(() =>
        expect(mockToast.success).toHaveBeenCalledWith(
          expect.stringMatching(/^userSettings\.planChangeScheduled/),
        ),
      );
      // useChangePlan refetches the plan itself; a second refetch is waste.
      expect(onChanged).not.toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
      // Scheduled, not yet in effect: not a purchase, nothing to celebrate.
      expect(
        mockTrack.mock.calls.filter(([event]) => event === "purchase"),
      ).toEqual([]);
      expect(mockCelebrate).not.toHaveBeenCalled();
      expect(
        mockTrack.mock.calls.filter(
          ([event]) => event === "plan_change_scheduled",
        ),
      ).toEqual([
        [
          "plan_change_scheduled",
          {
            kind: "DOWNGRADE",
            from: "growth_yearly",
            to: "premium_yearly",
            surface: "settings_billing",
          },
        ],
      ]);
    });

    it("lists no limits for a switch to monthly on the same tier", () => {
      show(
        scheduled({
          kind: "TO_MONTHLY",
          currentPriceId: PREMIUM_YEARLY,
          targetPriceId: PREMIUM_MONTHLY,
          limitChanges: [{ limit: "maxLedgers", from: 5, to: 5 }],
        }),
      );
      renderSheet({
        target: {
          tier: "premium",
          cycle: "monthly",
          surface: "settings_billing",
        },
        currentTier: "PREMIUM",
        currentCycle: "yearly",
        ledgersUsed: 3,
      });

      const body = within(screen.getByTestId("plan-change-scheduled"));
      expect(
        body.queryByText("userSettings.planChangeWhatChanges"),
      ).not.toBeInTheDocument();
      expect(
        body.getByRole("button", {
          name: "userSettings.planChangeScheduleSwitch",
        }),
      ).toBeInTheDocument();
    });

    it("offers a split's two options with server amounts, and applies the one chosen", async () => {
      const user = userEvent.setup();
      show(
        scheduled({
          kind: "SPLIT",
          currentPriceId: PREMIUM_YEARLY,
          targetPriceId: GROWTH_MONTHLY,
          alternativePriceId: GROWTH_YEARLY,
        }),
      );
      mockPreview.alternative = {
        data: preview({
          kind: "TO_YEARLY",
          currentPriceId: PREMIUM_YEARLY,
          targetPriceId: GROWTH_YEARLY,
          amountDueToday: 40_800,
          prorationDate: 1792238400,
        }),
        loading: false,
        error: undefined,
      };
      mockChangePlan.mockResolvedValue({
        data: { changePlan: { status: "ACTIVE" } },
      });
      renderSheet({
        target: {
          tier: "growth",
          cycle: "monthly",
          surface: "settings_billing",
        },
        currentTier: "PREMIUM",
        currentCycle: "yearly",
        ledgersUsed: 3,
      });

      expect(mockRunPreview).toHaveBeenCalledWith({
        variables: { clientId: "beancount-web-prod", priceId: GROWTH_YEARLY },
      });
      const body = within(screen.getByTestId("plan-change-scheduled"));
      expect(
        body.getByText(/userSettings\.planChangeSplitLater/),
      ).toBeInTheDocument();
      await user.click(
        body.getByRole("radio", { name: /userSettings\.planChangeSplitNow/ }),
      );
      await user.click(
        body.getByRole("button", {
          name: /^userSettings\.planChangePayAndSwitch/,
        }),
      );

      expect(mockChangePlan).toHaveBeenCalledWith({
        variables: {
          clientId: "beancount-web-prod",
          priceId: GROWTH_YEARLY,
          prorationDate: 1792238400,
        },
      });
    });

    const split = () => {
      show(
        scheduled({
          kind: "SPLIT",
          currentPriceId: PREMIUM_YEARLY,
          targetPriceId: GROWTH_MONTHLY,
          alternativePriceId: GROWTH_YEARLY,
        }),
      );
      renderSheet({
        target: {
          tier: "growth",
          cycle: "monthly",
          surface: "settings_billing",
        },
        currentTier: "PREMIUM",
        currentCycle: "yearly",
        ledgersUsed: 3,
      });
      return within(screen.getByTestId("plan-change-scheduled"));
    };
    const pricedAlternative = () => {
      mockPreview.alternative = {
        data: preview({
          kind: "TO_YEARLY",
          currentPriceId: PREMIUM_YEARLY,
          targetPriceId: GROWTH_YEARLY,
          amountDueToday: 40_800,
          prorationDate: 1792238400,
        }),
        loading: false,
        error: undefined,
      };
    };

    it("drops the renewal-date copy once the split's 'now' option is chosen, and reports it as the split", async () => {
      const user = userEvent.setup();
      pricedAlternative();
      mockChangePlan.mockResolvedValue({
        data: { changePlan: { status: "ACTIVE" } },
      });
      const body = split();
      expect(
        body.getByText(/^userSettings\.planChangeStartsOn/),
      ).toBeInTheDocument();

      await user.click(
        body.getByRole("radio", { name: /userSettings\.planChangeSplitNow/ }),
      );
      expect(
        body.queryByText(/^userSettings\.planChangeStartsOn/),
      ).not.toBeInTheDocument();
      await user.click(
        body.getByRole("button", {
          name: /^userSettings\.planChangePayAndSwitch/,
        }),
      );

      expect(
        mockTrack.mock.calls.find(
          ([event]) => event === "plan_change_confirmed",
        ),
      ).toEqual([
        "plan_change_confirmed",
        expect.objectContaining({ kind: "SPLIT", to: "growth_yearly" }),
      ]);
    });

    it("schedules the split's monthly change, with no proration, when 'later' is chosen back", async () => {
      const user = userEvent.setup();
      pricedAlternative();
      mockChangePlan.mockResolvedValue({
        data: {
          changePlan: {
            status: "SCHEDULED",
            effectiveAt: "2027-10-17T12:00:00Z",
          },
        },
      });
      const body = split();

      await user.click(
        body.getByRole("radio", { name: /userSettings\.planChangeSplitNow/ }),
      );
      await user.click(
        body.getByRole("radio", { name: /userSettings\.planChangeSplitLater/ }),
      );
      expect(
        body.getByRole("radio", { name: /userSettings\.planChangeSplitLater/ }),
      ).toBeChecked();
      await user.click(
        body.getByRole("button", {
          name: "userSettings.planChangeScheduleSwitch",
        }),
      );

      expect(mockChangePlan).toHaveBeenCalledTimes(1);
      expect(mockChangePlan).toHaveBeenCalledWith({
        variables: {
          clientId: "beancount-web-prod",
          priceId: GROWTH_MONTHLY,
          prorationDate: null,
        },
      });
      expect(
        mockTrack.mock.calls.find(
          ([event]) => event === "plan_change_confirmed",
        ),
      ).toEqual([
        "plan_change_confirmed",
        expect.objectContaining({ kind: "SPLIT", to: "growth_monthly" }),
      ]);
    });

    it("prices the split's 'now' option with the alternative's own amount, and confirms at its proration time", async () => {
      const user = userEvent.setup();
      mockPreview.alternative = {
        data: preview({
          kind: "TO_YEARLY",
          currentPriceId: PREMIUM_YEARLY,
          targetPriceId: GROWTH_YEARLY,
          amountDueToday: 40_800,
          prorationDate: 1792240000,
        }),
        loading: false,
        error: undefined,
      };
      mockChangePlan.mockResolvedValue({
        data: { changePlan: { status: "ACTIVE" } },
      });
      const body = split();

      const now = body.getByRole("radio", {
        name: "userSettings.planChangeSplitNow aiAgent.growthTier $408.00",
      });
      expect(now).toBeEnabled();
      await user.click(now);
      await user.click(
        body.getByRole("button", {
          name: "userSettings.planChangePayAndSwitch $408.00",
        }),
      );

      expect(mockChangePlan).toHaveBeenCalledTimes(1);
      expect(mockChangePlan).toHaveBeenCalledWith({
        variables: {
          clientId: "beancount-web-prod",
          priceId: GROWTH_YEARLY,
          prorationDate: 1792240000,
        },
      });
    });

    it("offers a retry when the 'now' option cannot be priced", async () => {
      const user = userEvent.setup();
      mockPreview.alternative = {
        data: undefined,
        loading: false,
        error: new Error("boom"),
      };
      const body = split();

      expect(
        body.getByRole("radio", {
          name: "userSettings.planChangePreviewFailed",
        }),
      ).toBeDisabled();
      mockRunPreview.mockClear();
      await user.click(body.getByRole("button", { name: "common.tryAgain" }));
      expect(mockRunPreview).toHaveBeenCalledWith({
        variables: { clientId: "beancount-web-prod", priceId: GROWTH_YEARLY },
      });
    });

    it("keeps the split choice when retrying after a declined payment", async () => {
      const user = userEvent.setup();
      pricedAlternative();
      mockChangePlan.mockResolvedValue({
        data: { changePlan: { status: "FAILED" } },
      });
      const body = split();
      await user.click(
        body.getByRole("radio", { name: /userSettings\.planChangeSplitNow/ }),
      );
      await user.click(
        body.getByRole("button", {
          name: /^userSettings\.planChangePayAndSwitch/,
        }),
      );
      await user.click(
        await screen.findByRole("button", { name: "common.tryAgain" }),
      );

      expect(
        within(screen.getByTestId("plan-change-scheduled")).getByRole("radio", {
          name: /userSettings\.planChangeSplitNow/,
        }),
      ).toBeChecked();
    });

    it("notes a replaced scheduled change, a withdrawn cancellation and a legacy price", () => {
      show(
        scheduled({
          currentPriceId: "price_1L9ccEEqsEqs2tLVKPRV17wb",
          replacesScheduledChange: {
            priceId: PREMIUM_MONTHLY,
            effectiveAt: "2027-10-17T12:00:00Z",
          },
          withdrawsCancellation: true,
        }),
      );
      downgrade(3);

      const notes = within(screen.getByTestId("plan-change-notes"));
      expect(
        notes.getByText(/^userSettings\.planChangeReplacesScheduled/),
      ).toBeInTheDocument();
      expect(
        notes.getByText("userSettings.planChangeWithdrawsCancellation"),
      ).toBeInTheDocument();
      expect(
        notes.getByText("userSettings.planChangeLegacyEnds"),
      ).toBeInTheDocument();
    });

    it("shows no notes on an ordinary change", () => {
      show(scheduled());
      downgrade(3);
      expect(screen.queryByTestId("plan-change-notes")).not.toBeInTheDocument();
    });
  });
});
