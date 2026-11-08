import { act, render, screen } from "@testing-library/react";
import { isRedirect } from "@tanstack/react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RouterContext } from "@/common/types/router-context";
import RegisterFlow from "..";
import { registerBeforeLoad } from "../loader";

/**
 * The marketing pricing page sends a new visitor to
 * `/sign-up/?next=/pricing?billing=yearly`. That page belongs to the CMS, not
 * this router, so every way out of sign-up toward it must be a document
 * navigation — a client navigation resolves inside the dashboard and 404s.
 */

const PRICING_NEXT = "/pricing?billing=yearly";
const UNSAFE_NEXT = [
  "https://evil.example/",
  "//evil.example/",
  "/\\evil.example/",
] as const;

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  hardNavigate: vi.fn(),
  search: {} as { next?: string },
  onRegistered: null as null | ((sessionId: string, email: string) => void),
  onSignedIn: null as null | ((token: { accessToken: string }) => unknown),
  onVerified: null as null | ((token: { accessToken: string }) => unknown),
}));

// `redirect`/`isRedirect` stay real; the page hooks and the form's sign-in
// link have no router to read here.
vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  useNavigate: () => mocks.navigate,
  useSearch: () => mocks.search,
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}));

vi.mock("@/common/lib/navigation/hard-navigate", () => ({
  hardNavigate: (...args: unknown[]) => mocks.hardNavigate(...args),
}));

vi.mock("@/common/components/seo/page-seo", () => ({ PageSEO: () => null }));

// The form hooks own the GraphQL calls; this suite drives their success
// callbacks to follow the flow, so the real pages and their redirect logic run.
vi.mock("@/features/auth/hooks/use-register-form", () => ({
  useRegisterForm: ({
    onSuccess,
    onSignedIn,
  }: {
    onSuccess: (sessionId: string, email: string) => void;
    onSignedIn?: (token: { accessToken: string }) => unknown;
  }) => {
    mocks.onRegistered = onSuccess;
    mocks.onSignedIn = onSignedIn ?? null;
    return {
      onSubmit: vi.fn(),
      isLoading: false,
      serverError: undefined,
      defaultUsername: "",
    };
  },
}));

vi.mock("@/features/auth/hooks/use-otp-form", () => ({
  useOtpForm: ({
    onSuccess,
  }: {
    onSuccess: (token: { accessToken: string }) => unknown;
  }) => {
    mocks.onVerified = onSuccess;
    return { onSubmit: vi.fn(), isLoading: false, serverError: undefined };
  },
}));

// input-otp schedules a timer that outlives the test environment.
vi.mock("@/features/auth/components/otp-form", () => ({
  OtpForm: () => <div data-testid="otp-form" />,
}));

type BeforeLoadInput = Parameters<typeof registerBeforeLoad>[0];

/** Runs the real beforeLoad; returns the thrown redirect's options, or null. */
function beforeLoad(
  userProfile: RouterContext["userProfile"],
  next: string | undefined,
) {
  try {
    void registerBeforeLoad({
      context: { userProfile } as RouterContext,
      search: { next },
    } as BeforeLoadInput);
    return null;
  } catch (thrown) {
    expect(isRedirect(thrown)).toBe(true);
    return (
      thrown as {
        options: { to?: string; href?: string; reloadDocument?: boolean };
      }
    ).options;
  }
}

const SIGNED_IN = {
  id: "user-1",
  username: "reader",
  email: "reader@example.com",
} as unknown as RouterContext["userProfile"];

describe("sign-up beforeLoad with a next destination", () => {
  it("sends a signed-in visitor back to the pricing page with a document reload", () => {
    const redirect = beforeLoad(SIGNED_IN, PRICING_NEXT);

    expect(redirect).toMatchObject({
      href: PRICING_NEXT,
      reloadDocument: true,
    });
    expect(redirect?.to).toBeUndefined();
  });

  it.each(UNSAFE_NEXT)(
    "sends a signed-in visitor to the welcome page instead of %s",
    (next) => {
      const redirect = beforeLoad(SIGNED_IN, next);

      expect(redirect).toMatchObject({ to: "/auth/welcome" });
      expect(redirect?.href).toBeUndefined();
      expect(redirect?.reloadDocument).toBeFalsy();
    },
  );

  it("lets a signed-out visitor reach the form, keeping next for later", () => {
    expect(beforeLoad(null, PRICING_NEXT)).toBeNull();
  });
});

describe("completing sign-up with a next destination", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.search = {};
    mocks.onRegistered = null;
    mocks.onVerified = null;
  });

  async function signUp(next: string | undefined) {
    mocks.search = { next };
    render(<RegisterFlow />);
    expect(screen.getByText("Create your account")).toBeInTheDocument();

    act(() => mocks.onRegistered?.("session-1", "reader@example.com"));
    expect(screen.getByTestId("otp-form")).toBeInTheDocument();

    await act(async () => {
      await mocks.onVerified?.({ accessToken: "synthetic-token" });
    });
  }

  it("lands on the pricing page with a full document navigation", async () => {
    await signUp(PRICING_NEXT);

    expect(mocks.hardNavigate).toHaveBeenCalledTimes(1);
    expect(mocks.hardNavigate).toHaveBeenCalledWith(PRICING_NEXT);
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it.each(UNSAFE_NEXT)(
    "never follows an unsafe next value (%s)",
    async (next) => {
      await signUp(next);

      expect(mocks.hardNavigate).not.toHaveBeenCalled();
      expect(mocks.navigate).toHaveBeenCalledWith({ to: "/auth/welcome" });
    },
  );

  it("goes to the welcome page when no next was given", async () => {
    await signUp(undefined);

    expect(mocks.hardNavigate).not.toHaveBeenCalled();
    expect(mocks.navigate).toHaveBeenCalledWith({ to: "/auth/welcome" });
  });
});

describe("sign-up on a self-hosted deployment (no code step)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.search = {};
    mocks.onSignedIn = null;
  });

  it("goes straight to the welcome page without showing the code form", async () => {
    render(<RegisterFlow />);
    await act(async () => {
      await mocks.onSignedIn?.({ accessToken: "synthetic-token" });
    });

    expect(screen.queryByTestId("otp-form")).not.toBeInTheDocument();
    expect(mocks.navigate).toHaveBeenCalledWith({ to: "/auth/welcome" });
  });

  it("still honours a safe next destination", async () => {
    mocks.search = { next: PRICING_NEXT };
    render(<RegisterFlow />);
    await act(async () => {
      await mocks.onSignedIn?.({ accessToken: "synthetic-token" });
    });

    expect(mocks.hardNavigate).toHaveBeenCalledWith(PRICING_NEXT);
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
});
