import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { track } from "@/common/analytics";
import AwesomePlainTextAccountingPage from "../page";
import { tools } from "../catalog";

vi.mock("@/common/analytics", () => ({ track: vi.fn() }));

describe("AwesomePlainTextAccountingPage", () => {
  beforeEach(() => {
    vi.mocked(track).mockClear();
  });

  it("leads with comparison before the hosted conversion prompt", () => {
    render(<AwesomePlainTextAccountingPage />);

    const comparison = screen.getByRole("heading", {
      name: "Beancount, hledger, or Ledger?",
    });
    const hosted = screen.getByRole("heading", {
      name: "Prefer the stack assembled for you?",
    });

    expect(
      comparison.compareDocumentPosition(hosted) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getAllByText("Beancount.io affiliated")).toHaveLength(2);
  });

  it("filters, reports an empty state, and resets without tracking search text", async () => {
    const user = userEvent.setup();
    render(<AwesomePlainTextAccountingPage />);

    const search = screen.getByRole("searchbox", { name: "Search tools" });
    await user.type(search, "NanoLedger");

    expect(
      screen.getByText(`Showing 1 of ${tools.length} resources`),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "NanoLedger" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Fava" }),
    ).not.toBeInTheDocument();
    expect(track).toHaveBeenCalledWith("awesome_pta_filter_changed", {
      filter: "search",
      state: "applied",
    });
    expect(JSON.stringify(vi.mocked(track).mock.calls)).not.toContain(
      "NanoLedger",
    );

    await user.clear(search);
    await user.type(search, "not-a-real-pta-tool");
    expect(
      screen.getByRole("heading", {
        name: "No tools match that combination",
      }),
    ).toBeInTheDocument();

    const resetButtons = screen.getAllByRole("button", {
      name: "Clear filters",
    });
    await user.click(resetButtons.at(-1)!);
    expect(
      screen.getByText(`Showing ${tools.length} of ${tools.length} resources`),
    ).toBeInTheDocument();
  });

  it("combines native filters and exposes a concrete contribution action", async () => {
    const user = userEvent.setup();
    render(<AwesomePlainTextAccountingPage />);

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Layer" }),
      "mobile",
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Accounting format" }),
      "hledger",
    );

    expect(
      screen.getByRole("heading", { name: "NanoLedger" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Cashier" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Beancount Mobile" }),
    ).not.toBeInTheDocument();

    const contribution = screen.getByRole("link", {
      name: /Suggest a tool or correction/,
    });
    expect(contribution).toHaveAttribute(
      "href",
      expect.stringContaining("/bex-co/beancount-io/issues/new"),
    );
    await user.click(contribution);
    expect(track).toHaveBeenCalledWith("awesome_pta_action_clicked", {
      action: "contribute",
      destination: "contribute",
    });
  });
});
