import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AuthPage from "..";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  hardNavigate: vi.fn(),
  search: {} as { oneTimeToken?: string; next?: string },
}));

vi.mock("@/common/lib/navigation/hard-navigate", () => ({
  hardNavigate: (...args: unknown[]) => mocks.hardNavigate(...args),
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mocks.navigate,
  useSearch: () => mocks.search,
  Navigate: () => null,
}));

vi.mock("@apollo/client/react", () => ({
  useApolloClient: () => ({
    query: vi.fn().mockResolvedValue({ data: { listLedgers: [] } }),
  }),
  useMutation: () => [
    vi.fn().mockResolvedValue({
      data: { signInWithOneTimeToken: { token: "t", expireAt: "x" } },
    }),
  ],
}));

vi.mock("@/common/hooks/use-is-authenticated", () => ({
  useIsAuthenticated: () => false,
}));

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({ t: (key: string) => key }),
}));

vi.mock("@/common/components/seo/page-seo", () => ({
  PageSEO: () => null,
}));

vi.mock(
  "@/common/providers/react-native-bridge-provider/legacy-auth-bridge",
  () => ({ postLegacyMobileAuthToken: vi.fn() }),
);

describe("AuthPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("continues to next with its query after signing in", async () => {
    mocks.search = {
      oneTimeToken: "once",
      next: "/oauth/consent?interaction=x",
    };
    render(<AuthPage />);
    await waitFor(() =>
      expect(mocks.hardNavigate).toHaveBeenCalledWith(
        "/oauth/consent?interaction=x",
      ),
    );
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it("goes to the welcome page without next", async () => {
    mocks.search = { oneTimeToken: "once" };
    render(<AuthPage />);
    await waitFor(() =>
      expect(mocks.navigate).toHaveBeenCalledWith({ to: "/auth/welcome" }),
    );
    expect(mocks.hardNavigate).not.toHaveBeenCalled();
  });
});
