import { MockedProvider } from "@apollo/client/testing/react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApiKeysDocument, RevokeApiKeyDocument } from "@/graphql/definitions";
import ApiKeysSettingsPage from "../index";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/common/components/seo/page-seo", () => ({
  PageSEO: () => null,
}));

const activeKey = {
  __typename: "ApiKeyType" as const,
  id: "key-1",
  name: "Reporting",
  keyPrefix: "bcio_safe",
  scopes: ["ledger.read"],
  ledgerScope: "alice/books",
  lastUsedAt: null,
  expiresAt: null,
  revokedAt: null,
  createdAt: "2026-08-29T10:00:00.000Z",
};

describe("personal access token revocation cache update", () => {
  it("shows the revoked state from the normalized mutation result", async () => {
    render(
      <MockedProvider
        mocks={[
          {
            request: { query: ApiKeysDocument },
            result: { data: { apiKeys: [activeKey] } },
          },
          {
            request: {
              query: RevokeApiKeyDocument,
              variables: { id: "key-1" },
            },
            result: {
              data: {
                revokeApiKey: {
                  ...activeKey,
                  revokedAt: "2026-08-29T11:00:00.000Z",
                },
              },
            },
          },
        ]}
      >
        <ApiKeysSettingsPage />
      </MockedProvider>,
    );

    expect(await screen.findByText("Reporting")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Revoke" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Revoke" }));

    expect(await screen.findByText("Revoked")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Revoke" }),
    ).not.toBeInTheDocument();
  });
});
