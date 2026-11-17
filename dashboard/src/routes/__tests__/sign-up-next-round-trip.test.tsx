import { act, cleanup, render, screen } from "@testing-library/react";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRouteWithContext,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RouterContext } from "@/common/types/router-context";
import RegisterFlow from "@/features/auth/pages/register";
import { Route as AuthSignUpRoute } from "@/routes/auth.sign-up";
import { Route as SignUpRoute } from "@/routes/sign-up";

/**
 * The marketing pricing page's yearly sign-up CTA, as the CMS builds it
 * (`pricingSignupUrl` + `productUrl`): the legacy `/sign-up/` mount, `next`
 * encoded by `URLSearchParams`, and campaign parameters after it. The real
 * route modules run in a memory router, so a `/sign-up` redirect or a
 * `/auth/sign-up` search schema that drops `next` strands the visitor in the
 * dashboard instead of returning them to the yearly price they chose.
 */
const PRICING_SIGN_UP =
  "/sign-up/?next=%2Fpricing%3Fbilling%3Dyearly&utm_source=beancount-site&utm_medium=cta&utm_campaign=pricing_signup_first";

const mocks = vi.hoisted(() => ({
  hardNavigate: vi.fn(),
  onRegistered: null as null | ((sessionId: string, email: string) => void),
  onVerified: null as null | ((token: { accessToken: string }) => unknown),
}));

vi.mock("@/common/lib/navigation/hard-navigate", () => ({
  hardNavigate: (...args: unknown[]) => mocks.hardNavigate(...args),
}));

vi.mock("@/common/components/seo/page-seo", () => ({ PageSEO: () => null }));

// The page asks the deployment whether it is self-hosted through Apollo, which
// this memory router does not provide; the managed service's answer is the
// one this flow was written for.
vi.mock("@/common/hooks/use-deployment-info", () => ({
  useDeploymentInfo: () => ({
    __typename: "DeploymentInfoResponse",
    selfHost: false,
    signUpOpen: true,
  }),
}));

vi.mock("@/features/auth/hooks/use-register-form", () => ({
  useRegisterForm: ({
    onSuccess,
  }: {
    onSuccess: (sessionId: string, email: string) => void;
  }) => {
    mocks.onRegistered = onSuccess;
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

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

async function openSignUp(entry: string) {
  const root = createRootRouteWithContext<RouterContext>()({
    component: Outlet,
  });
  const legacySignUp = createRoute({
    getParentRoute: () => root,
    path: "/sign-up",
    beforeLoad: SignUpRoute.options.beforeLoad,
  });
  const signUp = createRoute({
    getParentRoute: () => root,
    path: "/auth/sign-up",
    validateSearch: AuthSignUpRoute.options.validateSearch,
    beforeLoad: AuthSignUpRoute.options.beforeLoad,
    component: RegisterFlow,
  });
  const welcome = createRoute({
    getParentRoute: () => root,
    path: "/auth/welcome",
    component: () => <h1>Welcome</h1>,
  });
  const router = createRouter({
    routeTree: root.addChildren([legacySignUp, signUp, welcome]),
    history: createMemoryHistory({ initialEntries: [entry] }),
    context: { userProfile: null } as RouterContext,
    isServer: false,
  });
  render(<RouterProvider router={router} />);
  await screen.findByText("Create your account");
  return router;
}

describe("pricing sign-up next round trip", () => {
  it("keeps next through the /sign-up redirect and the sign-up search schema", async () => {
    const router = await openSignUp(PRICING_SIGN_UP);

    expect(router.state.location.pathname).toBe("/auth/sign-up");
    expect(router.state.matches.at(-1)?.search).toMatchObject({
      next: "/pricing?billing=yearly",
    });
  });

  it("declares next in the /auth/sign-up search schema", () => {
    // The router merges undeclared keys back in at runtime, so only the
    // schema's own output shows that `next` is part of the page's contract.
    const validate = AuthSignUpRoute.options.validateSearch as (
      search: Record<string, unknown>,
    ) => Record<string, unknown>;

    expect(
      validate({
        next: "/pricing?billing=yearly",
        utm_source: "beancount-site",
      }),
    ).toEqual({ next: "/pricing?billing=yearly" });
  });

  it("returns a new account to the yearly pricing page with a document navigation", async () => {
    await openSignUp(PRICING_SIGN_UP);

    act(() => mocks.onRegistered?.("session-1", "reader@example.com"));
    await screen.findByTestId("otp-form");
    await act(async () => {
      await mocks.onVerified?.({ accessToken: "synthetic-token" });
    });

    expect(mocks.hardNavigate).toHaveBeenCalledWith("/pricing?billing=yearly");
    expect(screen.queryByText("Welcome")).not.toBeInTheDocument();
  });
});
