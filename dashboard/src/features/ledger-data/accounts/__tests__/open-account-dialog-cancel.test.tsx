import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { OpenAccountDialog } from "../open-account-dialog";

vi.mock("@apollo/client/react", () => ({
  useApolloClient: () => ({ refetchQueries: async () => [] }),
  useMutation: () => [vi.fn(), { loading: false }],
  useQuery: () => ({
    data: {
      getLedger: {
        options: {
          nameAssets: "Assets",
          nameLiabilities: "Liabilities",
          nameEquity: "Equity",
          nameIncome: "Income",
          nameExpenses: "Expenses",
        },
      },
    },
    loading: false,
  }),
}));

vi.mock("@/common/lib/errors/error-message", () => ({
  useErrorMessage: () => () => "error",
}));

vi.mock("@/common/hooks/use-date-locale", async () => {
  const { enUS } = await import("react-day-picker/locale/en-US");
  return { useDateLocale: () => enUS };
});

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open Account
      </button>
      <OpenAccountDialog
        open={open}
        onOpenChange={setOpen}
        ledgerId="owner/ledger"
      />
    </>
  );
}

describe("OpenAccountDialog cancel resets draft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("clears the account name after Cancel before reopening", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "Open Account" }));
    const account = screen.getByLabelText("Account Name");
    await user.type(account, "Assets:QaCancelDraft");
    expect(account).toHaveValue("Assets:QaCancelDraft");

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    // A typed draft asks before it is discarded (w2/134).
    await user.click(await screen.findByRole("button", { name: "Discard" }));
    await user.click(screen.getByRole("button", { name: "Open Account" }));

    expect(screen.getByLabelText("Account Name")).toHaveValue("");
  });
});
