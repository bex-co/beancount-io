import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OidcSection } from "../oidc-section";

const mocks = vi.hoisted(() => ({
  linked: false,
  search: {} as { oidcError?: string },
  createLinkUrl: vi.fn(),
  unlinkOidc: vi.fn(),
  refetch: vi.fn(),
}));

vi.mock("@apollo/client/react", () => ({
  useQuery: () => ({
    data: { oidcLinked: mocks.linked },
    refetch: mocks.refetch,
  }),
  useMutation: (document: { definitions: { name: { value: string } }[] }) =>
    document.definitions[0]!.name.value === "UnlinkOidc"
      ? [mocks.unlinkOidc, { loading: false }]
      : [mocks.createLinkUrl, { loading: false }],
}));

vi.mock("@tanstack/react-router", () => ({
  useSearch: () => mocks.search,
}));

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({ t: (key: string) => key }),
}));

vi.mock("@/common/lib/errors/error-message", () => ({
  getErrorMessageKey: () => "common.errors.forbidden",
}));

vi.mock("@/common/hooks/use-deployment-info", () => ({
  useDeploymentInfo: () => ({ oidcProviderName: "Keycloak" }),
}));

describe("OidcSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.linked = false;
    mocks.search = {};
  });

  it("offers to link an account that is not linked", () => {
    render(<OidcSection />);
    expect(screen.getByText("auth.oidcNotLinked")).toBeTruthy();
    expect(screen.getByText("auth.oidcLink")).toBeTruthy();
  });

  it("offers to unlink a linked account", () => {
    mocks.linked = true;
    render(<OidcSection />);
    expect(screen.getByText("auth.oidcLinked")).toBeTruthy();
    expect(screen.getByText("auth.oidcUnlink")).toBeTruthy();
  });

  it("asks for a password when unlink is refused", async () => {
    mocks.linked = true;
    mocks.unlinkOidc.mockRejectedValue(new Error("forbidden"));
    render(<OidcSection />);
    await act(async () => {
      fireEvent.click(screen.getByText("auth.oidcUnlink"));
    });
    expect(screen.getByText("auth.oidcUnlinkNeedsPassword")).toBeTruthy();
  });

  it("shows the error from a failed link until the next click", async () => {
    mocks.linked = true;
    mocks.search = { oidcError: "account_linked" };
    mocks.unlinkOidc.mockResolvedValue({});
    render(<OidcSection />);
    expect(screen.getByText("auth.oidcErrorAccountLinked")).toBeTruthy();
    await act(async () => {
      fireEvent.click(screen.getByText("auth.oidcUnlink"));
    });
    expect(screen.queryByText("auth.oidcErrorAccountLinked")).toBeNull();
  });
});
