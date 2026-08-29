import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiKeyListItem } from "../api-key-utils";
import ApiKeysSettingsPage from "../index";

const mockRefetch = vi.fn();
let queryResult: {
  data?: { apiKeys: ApiKeyListItem[] };
  loading: boolean;
  error?: Error;
  refetch: typeof mockRefetch;
};

vi.mock("@apollo/client/react", () => ({
  useQuery: () => queryResult,
  useMutation: () => [vi.fn(), { loading: false, reset: vi.fn() }],
}));

vi.mock("@/common/components/seo/page-seo", () => ({
  PageSEO: () => null,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const baseKey: ApiKeyListItem = {
  __typename: "ApiKeyType",
  id: "key-active",
  name: "Reporting",
  keyPrefix: "bcio_safe",
  scopes: ["ledger.read"],
  ledgerScope: "alice/books",
  lastUsedAt: null,
  expiresAt: null,
  revokedAt: null,
  createdAt: "2026-08-29T10:00:00.000Z",
};

describe("ApiKeysSettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryResult = { loading: false, refetch: mockRefetch };
  });

  it("renders the initial loading state", () => {
    queryResult = { loading: true, refetch: mockRefetch };
    render(<ApiKeysSettingsPage />);

    expect(screen.getByText("Loading personal access tokens…")).toBeVisible();
  });

  it("renders the empty state without inventing a secret", () => {
    queryResult = {
      data: { apiKeys: [] },
      loading: false,
      refetch: mockRefetch,
    };
    render(<ApiKeysSettingsPage />);

    expect(screen.getByText("No personal access tokens")).toBeVisible();
    expect(
      screen.queryByLabelText("Personal access token"),
    ).not.toBeInTheDocument();
  });

  it("renders a recoverable load error", () => {
    queryResult = {
      loading: false,
      error: new Error("offline"),
      refetch: mockRefetch,
    };
    render(<ApiKeysSettingsPage />);

    expect(
      screen.getByText("Failed to load personal access tokens"),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(mockRefetch).toHaveBeenCalledOnce();
  });

  it("renders active, expired, and revoked metadata-only entries", () => {
    queryResult = {
      data: {
        apiKeys: [
          baseKey,
          {
            ...baseKey,
            id: "key-expired",
            name: "Old importer",
            expiresAt: "2020-01-01T00:00:00.000Z",
          },
          {
            ...baseKey,
            id: "key-revoked",
            name: "Retired job",
            revokedAt: "2026-08-29T11:00:00.000Z",
          },
        ],
      },
      loading: false,
      refetch: mockRefetch,
    };
    render(<ApiKeysSettingsPage />);

    expect(screen.getByText("Active")).toBeVisible();
    expect(screen.getByText("Expired")).toBeVisible();
    expect(screen.getByText("Revoked")).toBeVisible();
    expect(screen.getAllByText(/bcio_safe…/)).toHaveLength(3);
    expect(
      screen.queryByLabelText("Personal access token"),
    ).not.toBeInTheDocument();
  });
});
