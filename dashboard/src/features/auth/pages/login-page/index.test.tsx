import { act, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from ".";

const mocks = vi.hoisted(() => ({
  getDefaultLedger: vi.fn(),
  navigate: vi.fn(),
  onSuccess: null as null | ((token: { accessToken: string }) => Promise<void>),
  search: {} as { next?: string; reason?: string },
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mocks.navigate,
  useSearch: () => mocks.search,
}));

vi.mock("@apollo/client/react", () => ({
  useApolloClient: () => ({ query: vi.fn() }),
}));

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({ t: (key: string) => key }),
}));

vi.mock("@/features/auth/hooks/use-login-form", () => ({
  useLoginForm: ({
    onSuccess,
  }: {
    onSuccess: (token: { accessToken: string }) => Promise<void>;
  }) => {
    mocks.onSuccess = onSuccess;
    return { onSubmit: vi.fn(), isLoading: false, serverError: "" };
  },
}));

vi.mock("@/common/lib/utils/ledger-utils", () => ({
  getUserDefaultLedger: (...args: unknown[]) => mocks.getDefaultLedger(...args),
}));

vi.mock("@/features/auth/components/login-form", () => ({
  LoginForm: () => <div>login form</div>,
}));

vi.mock("@/common/components/seo/page-seo", () => ({
  PageSEO: () => null,
}));

describe("LoginPage redirect continuation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.onSuccess = null;
    mocks.search = {};
    mocks.getDefaultLedger.mockResolvedValue(null);
    vi.spyOn(window, "postMessage").mockImplementation(() => undefined);
  });

  it("returns to a relative next path when no default ledger exists", async () => {
    mocks.search = { next: "/ledger/alice/book/journal" };
    render(<LoginPage />);

    await act(async () => {
      await mocks.onSuccess?.({ accessToken: "auth-token" });
    });

    expect(mocks.navigate).toHaveBeenCalledWith({
      to: "/ledger/alice/book/journal",
    });
  });

  it.each([
    "https://evil.example/invite",
    "//evil.example/invite",
    "/\\evil.example/invite",
  ])("never reuses an unsafe next value (%s)", async (next) => {
    mocks.search = { next };
    render(<LoginPage />);

    await act(async () => {
      await mocks.onSuccess?.({ accessToken: "auth-token" });
    });

    expect(mocks.navigate).toHaveBeenCalledWith({ to: "/auth/welcome" });
    expect(mocks.navigate).not.toHaveBeenCalledWith({ to: next });
  });
});
