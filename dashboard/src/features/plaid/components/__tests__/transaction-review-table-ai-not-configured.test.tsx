import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { TransactionReviewTable } from "../transaction-review-table";
import {
  useUnsyncedTransactions,
  usePlaidAccountsForLedger,
  useSuggestPlaidCategories,
  useSubmitPlaidTransactions,
  useDeletePlaidTransactions,
} from "../../hooks/use-plaid-accounts";

/**
 * A deployment without an LLM key refuses AI Fill as CONFIGURATION_ERROR with
 * a hint naming the variables to set. The toast must say so rather than ask
 * for another try that will be refused the same way.
 */
const toast = vi.fn();

vi.mock("@/common/hooks/use-toast", () => ({
  useToast: () => ({ toast }),
}));

vi.mock("../../hooks/use-plaid-accounts", () => ({
  useUnsyncedTransactions: vi.fn(),
  usePlaidAccountsForLedger: vi.fn(),
  useSuggestPlaidCategories: vi.fn(),
  useSubmitPlaidTransactions: vi.fn(),
  useDeletePlaidTransactions: vi.fn(),
}));

vi.mock("@/common/components/ledger-comboboxes", () => ({
  AccountCombobox: () => <input data-testid="account-combobox" />,
  SourceFileCombobox: () => <input data-testid="source-file-combobox" />,
}));

const HINT = "Set ANTHROPIC_API_KEY or OPENAI_API_KEY (see .env.example)";

const suggestCategories = vi.fn();

function renderTable() {
  vi.mocked(useUnsyncedTransactions).mockReturnValue({
    transactions: [
      {
        id: "ptxn_1",
        plaidAccountId: "pacc_1",
        transactionId: "tx_1",
        date: "2026-01-15",
        amount: "12.50",
        merchantName: "Coffee Shop",
        name: "COFFEE SHOP #42",
        isPending: false,
        accountName: "Checking",
        institutionName: "Chase",
        ledgerAccount: "Assets:Checking",
      },
    ],
    loading: false,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useUnsyncedTransactions>);
  vi.mocked(usePlaidAccountsForLedger).mockReturnValue({
    accounts: [],
    loading: false,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof usePlaidAccountsForLedger>);
  vi.mocked(useSuggestPlaidCategories).mockReturnValue({
    suggestCategories,
    loading: false,
  } as unknown as ReturnType<typeof useSuggestPlaidCategories>);
  vi.mocked(useSubmitPlaidTransactions).mockReturnValue({
    submitTransactions: vi.fn(),
    loading: false,
  } as unknown as ReturnType<typeof useSubmitPlaidTransactions>);
  vi.mocked(useDeletePlaidTransactions).mockReturnValue({
    deleteTransactions: vi.fn(),
    loading: false,
  } as unknown as ReturnType<typeof useDeletePlaidTransactions>);

  render(<TransactionReviewTable ledgerId="owner/ledger" />);
  fireEvent.click(screen.getByRole("button", { name: /AI Fill/ }));
}

describe("TransactionReviewTable AI Fill on an unconfigured deployment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the server's message and operator hint, not a try-again", async () => {
    suggestCategories.mockRejectedValue(
      new CombinedGraphQLErrors({
        errors: [
          {
            message: "LLM is not configured on this deployment",
            extensions: { code: "CONFIGURATION_ERROR", hint: HINT },
          },
        ],
      }),
    );

    renderTable();

    await waitFor(() => expect(toast).toHaveBeenCalledTimes(1));
    const { description, variant } = toast.mock.calls[0][0];
    expect(variant).toBe("destructive");
    expect(description).toBe(
      `This feature isn't set up on this server. LLM is not configured on this deployment. ${HINT}`,
    );
    expect(description).not.toMatch(/try again/i);
  });

  it("keeps the try-again copy for an ordinary failure", async () => {
    suggestCategories.mockRejectedValue(new Error("boom"));

    renderTable();

    await waitFor(() => expect(toast).toHaveBeenCalledTimes(1));
    expect(toast.mock.calls[0][0].description).toBe(
      "Failed to categorize transactions. Please try again.",
    );
  });
});
