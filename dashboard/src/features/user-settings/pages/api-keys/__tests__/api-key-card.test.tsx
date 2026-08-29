import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiKeyListItem } from "../api-key-utils";
import { ApiKeyCard } from "../api-key-card";

const mockRevoke = vi.fn();

vi.mock("@apollo/client/react", () => ({
  useMutation: () => [mockRevoke, { loading: false }],
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const baseKey: ApiKeyListItem = {
  __typename: "ApiKeyType",
  id: "key-1",
  name: "Reporting",
  keyPrefix: "bcio_abcd",
  scopes: ["ledger.read"],
  ledgerScope: "alice/books",
  lastUsedAt: null,
  expiresAt: null,
  revokedAt: null,
  createdAt: "2026-08-29T10:00:00.000Z",
};

describe("ApiKeyCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRevoke.mockResolvedValue({ data: { revokeApiKey: baseKey } });
  });

  it.each([
    ["Active", baseKey],
    [
      "Expired",
      { ...baseKey, id: "key-2", expiresAt: "2020-01-01T00:00:00.000Z" },
    ],
    [
      "Revoked",
      { ...baseKey, id: "key-3", revokedAt: "2026-08-29T11:00:00.000Z" },
    ],
  ])("renders the %s lifecycle state", (label, apiKey) => {
    render(<ApiKeyCard apiKey={apiKey} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("revokes an active token after confirmation", async () => {
    render(<ApiKeyCard apiKey={baseKey} />);
    fireEvent.click(screen.getByRole("button", { name: "Revoke" }));
    expect(mockRevoke).not.toHaveBeenCalled();
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Revoke" }));

    await waitFor(() =>
      expect(mockRevoke).toHaveBeenCalledWith({
        variables: { id: "key-1" },
      }),
    );
  });

  it("does not offer revoke for inactive tokens", () => {
    render(
      <ApiKeyCard
        apiKey={{ ...baseKey, revokedAt: "2026-08-29T11:00:00.000Z" }}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Revoke" }),
    ).not.toBeInTheDocument();
  });
});
