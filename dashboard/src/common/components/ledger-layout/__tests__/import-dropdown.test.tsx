import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImportDropdown } from "../import-dropdown";

const mockNavigate = vi.fn();
let canWrite = true;

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({
    ledgerOwner: "alice",
    ledgerName: "my-ledger",
  }),
}));

vi.mock("@/common/hooks/use-ledger-permission", () => ({
  useLedgerPermission: () => ({ canWrite }),
}));

describe("ImportDropdown", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    canWrite = true;
  });

  it("renders the import trigger button", () => {
    render(<ImportDropdown />);

    const button = screen.getByRole("button", { name: /^Import$/i });
    expect(button).toBeInTheDocument();
  });

  it("navigates to the canonical journal action when Add an entry is clicked", async () => {
    const user = userEvent.setup();
    render(<ImportDropdown />);

    // Open dropdown
    await user.click(screen.getByRole("button", { name: /^Import$/i }));

    // Click Manual Import item
    const manualItem = await screen.findByText("Add an entry");
    await user.click(manualItem);

    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/ledger/$ledgerOwner/$ledgerName/journal",
      params: { ledgerOwner: "alice", ledgerName: "my-ledger" },
      search: { action: "new-entry", directive: "transaction" },
    });
  });

  it("navigates to smart import page when Smart Import is clicked", async () => {
    const user = userEvent.setup();
    render(<ImportDropdown />);

    await user.click(screen.getByRole("button", { name: /^Import$/i }));

    const smartItem = await screen.findByText("Smart Import");
    await user.click(smartItem);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/ledger/$ledgerOwner/$ledgerName/import",
        params: { ledgerOwner: "alice", ledgerName: "my-ledger" },
      });
    });
  });

  it("navigates to link import page when Connect Bank is clicked", async () => {
    const user = userEvent.setup();
    render(<ImportDropdown />);

    await user.click(screen.getByRole("button", { name: /^Import$/i }));

    const linkItem = await screen.findByText("Connect Bank");
    await user.click(linkItem);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/ledger/$ledgerOwner/$ledgerName/link",
        params: { ledgerOwner: "alice", ledgerName: "my-ledger" },
      });
    });
  });

  it("does not offer a mutation action to read-only users", async () => {
    canWrite = false;
    const user = userEvent.setup();
    render(<ImportDropdown />);

    await user.click(screen.getByRole("button", { name: /^Import$/i }));
    expect(screen.queryByText("Add an entry")).not.toBeInTheDocument();
    expect(screen.getByText("Smart Import")).toBeInTheDocument();
  });
});
