import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AccountMappingForm } from "../account-mapping-form";
import {
  usePlaidAccountsForItem,
  useUpdateAccountMapping,
  useUpdateAccountCurrency,
  useSuggestPlaidAccountMapping,
  useBatchUpdateAccountMapping,
} from "../../../../hooks/use-plaid-accounts";

vi.mock("../../../../hooks/use-plaid-accounts", () => ({
  usePlaidAccountsForItem: vi.fn(),
  useUpdateAccountMapping: vi.fn(),
  useUpdateAccountCurrency: vi.fn(),
  useSuggestPlaidAccountMapping: vi.fn(),
  useBatchUpdateAccountMapping: vi.fn(),
}));

vi.mock("@/common/components/ledger-comboboxes", () => ({
  AccountCombobox: ({
    value,
    onValueChange,
    placeholder,
    disabled,
  }: {
    value: string;
    onValueChange: (v: string) => void;
    placeholder?: string;
    disabled?: boolean;
  }) => (
    <input
      data-testid="account-combobox"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
    />
  ),
  OperatingCurrencyCombobox: ({
    value,
    onValueChange,
    disabled,
  }: {
    value: string;
    onValueChange: (v: string) => void;
    disabled?: boolean;
  }) => (
    <input
      data-testid="currency-combobox"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      disabled={disabled}
    />
  ),
}));

const mockUsePlaidAccountsForItem = vi.mocked(usePlaidAccountsForItem);
const mockUseUpdateAccountMapping = vi.mocked(useUpdateAccountMapping);
const mockUseUpdateAccountCurrency = vi.mocked(useUpdateAccountCurrency);
const mockUseSuggestPlaidAccountMapping = vi.mocked(
  useSuggestPlaidAccountMapping,
);
const mockUseBatchUpdateAccountMapping = vi.mocked(
  useBatchUpdateAccountMapping,
);

const account = {
  id: "pacc_1",
  accountName: "Checking",
  accountType: "depository",
  mask: "1234",
  ledgerAccount: "Assets:Checking",
  currency: "USD",
};

describe("AccountMappingForm", () => {
  const refetch = vi.fn().mockResolvedValue(undefined);
  const updateMapping = vi.fn().mockResolvedValue(undefined);
  const updateCurrency = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    refetch.mockClear().mockResolvedValue(undefined);
    updateMapping.mockClear().mockResolvedValue(undefined);
    updateCurrency.mockClear().mockResolvedValue(undefined);

    mockUsePlaidAccountsForItem.mockReturnValue({
      accounts: [account],
      loading: false,
      error: undefined,
      refetch,
    } as unknown as ReturnType<typeof usePlaidAccountsForItem>);

    mockUseUpdateAccountMapping.mockReturnValue({
      updateMapping,
      loading: false,
      error: undefined,
    } as unknown as ReturnType<typeof useUpdateAccountMapping>);

    mockUseUpdateAccountCurrency.mockReturnValue({
      updateCurrency,
      loading: false,
      error: undefined,
    } as unknown as ReturnType<typeof useUpdateAccountCurrency>);

    mockUseSuggestPlaidAccountMapping.mockReturnValue({
      suggestAccountMapping: vi.fn().mockResolvedValue([]),
      loading: false,
      error: undefined,
    } as unknown as ReturnType<typeof useSuggestPlaidAccountMapping>);

    mockUseBatchUpdateAccountMapping.mockReturnValue({
      updateMappings: vi.fn().mockResolvedValue(undefined),
      loading: false,
      error: undefined,
    } as unknown as ReturnType<typeof useBatchUpdateAccountMapping>);
  });

  const enterEditMode = () => {
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  };

  it("shows the account's currency as a read-only badge, not a combobox, when not editing", () => {
    render(<AccountMappingForm itemId="pitm_1" ledgerId="owner/ledger" />);

    expect(screen.getByText("USD")).toBeInTheDocument();
    expect(screen.queryByTestId("currency-combobox")).not.toBeInTheDocument();
  });

  it("pre-fills both fields with the account's current values when entering edit mode", () => {
    render(<AccountMappingForm itemId="pitm_1" ledgerId="owner/ledger" />);

    enterEditMode();

    expect(screen.getByTestId("account-combobox")).toHaveValue(
      "Assets:Checking",
    );
    expect(screen.getByTestId("currency-combobox")).toHaveValue("USD");
  });

  it("saves only the currency when only the currency was changed", async () => {
    render(<AccountMappingForm itemId="pitm_1" ledgerId="owner/ledger" />);

    enterEditMode();
    fireEvent.change(screen.getByTestId("currency-combobox"), {
      target: { value: "EUR" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(updateCurrency).toHaveBeenCalledWith(
        "owner/ledger",
        "pacc_1",
        "EUR",
      );
    });
    expect(updateMapping).not.toHaveBeenCalled();
  });

  it("saves only the mapping when only the ledger account was changed", async () => {
    render(<AccountMappingForm itemId="pitm_1" ledgerId="owner/ledger" />);

    enterEditMode();
    fireEvent.change(screen.getByTestId("account-combobox"), {
      target: { value: "Assets:Savings" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(updateMapping).toHaveBeenCalledWith(
        "owner/ledger",
        "pacc_1",
        "Assets:Savings",
      );
    });
    expect(updateCurrency).not.toHaveBeenCalled();
  });

  it("saves both fields when both were changed", async () => {
    render(<AccountMappingForm itemId="pitm_1" ledgerId="owner/ledger" />);

    enterEditMode();
    fireEvent.change(screen.getByTestId("account-combobox"), {
      target: { value: "Assets:Savings" },
    });
    fireEvent.change(screen.getByTestId("currency-combobox"), {
      target: { value: "EUR" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(updateMapping).toHaveBeenCalledWith(
        "owner/ledger",
        "pacc_1",
        "Assets:Savings",
      );
      expect(updateCurrency).toHaveBeenCalledWith(
        "owner/ledger",
        "pacc_1",
        "EUR",
      );
    });
  });

  it("discards both edits and calls neither mutation on Cancel", () => {
    render(<AccountMappingForm itemId="pitm_1" ledgerId="owner/ledger" />);

    enterEditMode();
    fireEvent.change(screen.getByTestId("account-combobox"), {
      target: { value: "Assets:Savings" },
    });
    fireEvent.change(screen.getByTestId("currency-combobox"), {
      target: { value: "EUR" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(updateMapping).not.toHaveBeenCalled();
    expect(updateCurrency).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
  });

  it("disables both fields and both buttons while either mutation is in flight", () => {
    mockUseUpdateAccountCurrency.mockReturnValue({
      updateCurrency,
      loading: true,
      error: undefined,
    } as unknown as ReturnType<typeof useUpdateAccountCurrency>);

    render(<AccountMappingForm itemId="pitm_1" ledgerId="owner/ledger" />);

    enterEditMode();

    expect(screen.getByTestId("account-combobox")).toBeDisabled();
    expect(screen.getByTestId("currency-combobox")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });
});
