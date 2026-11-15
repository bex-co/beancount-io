import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
} from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "..";
import { SignInRecovery } from "@/features/auth/components/sign-in-recovery";

const mocks = vi.hoisted(() => ({
  search: {} as { next?: string; recovery?: string },
  navigate: vi.fn(),
  hardNavigate: vi.fn(),
  getDefaultLedger: vi.fn(),
  postMobile: vi.fn(),
  track: vi.fn(),
}));
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mocks.navigate,
  useSearch: () => mocks.search,
  useLocation: () => ({
    pathname: "/auth/login/",
    search: mocks.search,
    href: window.location.href,
  }),
  Link: ({ to, children }: { to: string; children: ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}));
vi.mock("@/common/lib/navigation/hard-navigate", () => ({
  hardNavigate: (...args: unknown[]) => mocks.hardNavigate(...args),
}));
vi.mock("@/common/lib/utils/ledger-utils", () => ({
  getUserDefaultLedger: (...args: unknown[]) => mocks.getDefaultLedger(...args),
}));
vi.mock(
  "@/common/providers/react-native-bridge-provider/legacy-auth-bridge",
  () => ({
    postLegacyMobileAuthToken: (...args: unknown[]) =>
      mocks.postMobile(...args),
  }),
);
vi.mock("@/common/analytics", () => ({
  track: (...args: unknown[]) => mocks.track(...args),
}));

const EMAIL = "synthetic-owner@example.com";
const PASSWORD = "synthetic-private-password";
const CODE = "123456";
const CHALLENGE = `rcv_${"a".repeat(64)}`;
const clients: ApolloClient[] = [];

function network() {
  type Pending = {
    name: string;
    variables: Record<string, unknown>;
    succeed: (data: Record<string, unknown>) => void;
    refuse: (code: string, retryAfter?: number) => void;
  };
  const pending: Pending[] = [];
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      (operation) =>
        new Observable((observer) => {
          // The page asks the deployment who it is for before anything else;
          // answered at once so the flows under test see only their own requests.
          if (operation.operationName === "DeploymentInfo") {
            observer.next({
              data: {
                deploymentInfo: {
                  __typename: "DeploymentInfoResponse",
                  selfHost: false,
                  signUpOpen: true,
                },
              },
            });
            observer.complete();
            return;
          }
          pending.push({
            name: operation.operationName,
            variables: operation.variables,
            succeed(data) {
              observer.next({ data });
              observer.complete();
            },
            refuse(code, retryAfter) {
              observer.next({
                errors: [
                  {
                    message: "synthetic private provider detail",
                    extensions: { code, retryAfter },
                  },
                ],
              });
              observer.complete();
            },
          });
        }),
    ),
  });
  clients.push(client);
  return {
    pending,
    client,
    page: () => (
      <ApolloProvider client={client}>
        <LoginPage />
      </ApolloProvider>
    ),
    recovery: (
      props: Partial<React.ComponentProps<typeof SignInRecovery>> = {},
    ) => (
      <ApolloProvider client={client}>
        <SignInRecovery onSuccess={vi.fn()} onBack={vi.fn()} {...props} />
      </ApolloProvider>
    ),
  };
}

async function credentials(code = CODE) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Email address"), EMAIL);
  await user.type(screen.getByLabelText("Password", { exact: true }), PASSWORD);
  const input = screen.queryByLabelText("Six-digit verification code");
  if (input) await user.type(input, code);
  return user;
}

const session = {
  signInWithEmailCode: {
    token: "synthetic-session-token",
    expireAt: "2030-01-01T00:00:00.000Z",
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.search = {};
  mocks.getDefaultLedger.mockResolvedValue(null);
  document.head.innerHTML = "";
  window.history.replaceState({}, "", "/auth/login/");
});
afterEach(() => {
  cleanup();
  for (const client of clients.splice(0)) client.stop();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("the real login form and Apollo recovery mutations", () => {
  it.each([false, true])(
    "renders private metadata only for a mailed recovery link (recovery=%s)",
    (privateRecovery) => {
      mocks.search = {
        next: "/ledger/owner/book#latest",
        ...(privateRecovery ? { recovery: CHALLENGE } : {}),
      };
      window.history.replaceState(
        {},
        "",
        privateRecovery
          ? `/auth/login/?recovery=${CHALLENGE}`
          : "/auth/login/?next=%2Fledger%2Fowner%2Fbook%23latest",
      );
      const api = network();
      const ssr = new DOMParser().parseFromString(
        renderToString(api.page()),
        "text/html",
      );
      render(api.page());
      for (const head of [ssr.head, document.head]) {
        expect(head.querySelector("title")?.textContent).toBe(
          "Sign In to Beancount — Free Plain-Text Accounting",
        );
        expect(
          head
            .querySelector('meta[name="description"]')
            ?.getAttribute("content"),
        ).toBeTruthy();
        expect(head.innerHTML).not.toContain(CHALLENGE);
        if (privateRecovery) {
          expect(
            head.querySelector('meta[name="robots"]')?.getAttribute("content"),
          ).toBe("noindex, follow");
          expect(
            head
              .querySelector('meta[name="referrer"]')
              ?.getAttribute("content"),
          ).toBe("no-referrer");
          expect(head.querySelector('link[rel="canonical"]')).toBeNull();
          expect(head.querySelector('link[rel="alternate"]')).toBeNull();
        } else {
          expect(head.querySelector('meta[name="robots"]')).toBeNull();
          expect(head.querySelector('meta[name="referrer"]')).toBeNull();
          expect(
            head.querySelector('link[rel="canonical"]')?.getAttribute("href"),
          ).toBe("https://beancount.io/auth/login/");
          expect(head.querySelector('link[rel="alternate"]')).not.toBeNull();
        }
      }
      expect(api.pending).toHaveLength(0);
    },
  );

  it("offers recovery after throttling and sends exactly one explicit request with the safe continuation", async () => {
    const next = "/ledger/owner/book?view=journal#latest";
    mocks.search = { next };
    const api = network();
    const view = render(api.page());
    expect(api.pending).toHaveLength(0);
    const user = await credentials();
    await user.click(
      screen.getByRole("button", { name: "Sign In", exact: true }),
    );
    await waitFor(() => expect(api.pending).toHaveLength(1));
    await act(async () => api.pending[0].refuse("RATE_LIMITED", 900));
    await user.click(
      screen.getByRole("button", { name: "Verify email to sign in" }),
    );
    expect(api.pending).toHaveLength(1);
    view.rerender(api.page());
    expect(api.pending).toHaveLength(1);
    expect(screen.getByLabelText("Email address")).toHaveValue(EMAIL);
    await user.dblClick(
      screen.getByRole("button", { name: "Send recovery email" }),
    );
    await waitFor(() => expect(api.pending).toHaveLength(2));
    expect(api.pending[1]).toMatchObject({
      name: "RequestSignInRecovery",
      variables: { email: EMAIL, returnTo: next },
    });
    await act(async () =>
      api.pending[1].succeed({ requestSignInRecovery: { success: true } }),
    );
    expect(
      await screen.findByText(/If this address has an account/),
    ).toHaveAttribute("role", "status");
    expect(
      screen.getByRole("button", { name: "Send another recovery email" }),
    ).toBeDisabled();
    expect(
      screen.queryByLabelText("Six-digit verification code"),
    ).not.toBeInTheDocument();
    expect(mocks.postMobile).not.toHaveBeenCalled();
    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(mocks.hardNavigate).not.toHaveBeenCalled();
  });

  it("opens the mailed proof without sending mail and associates six-digit validation with its field", async () => {
    mocks.search = { recovery: CHALLENGE };
    const api = network();
    const view = render(api.page());
    view.rerender(api.page());
    expect(api.pending).toHaveLength(0);
    const user = await credentials("12345");
    const code = screen.getByLabelText("Six-digit verification code");
    expect(code).toHaveAttribute("autocomplete", "one-time-code");
    await user.click(
      screen.getByRole("button", { name: "Verify and sign in" }),
    );
    expect(
      await screen.findByText(
        "Enter the six-digit code from your recovery email.",
      ),
    ).toHaveAttribute("role", "alert");
    expect(code).toHaveAttribute("aria-invalid", "true");
    const describedBy = code.getAttribute("aria-describedby")!.split(" ");
    expect(
      describedBy.some((id) =>
        document.getElementById(id)?.textContent?.includes("six-digit code"),
      ),
    ).toBe(true);
    expect(api.pending).toHaveLength(0);
    expect(mocks.postMobile).not.toHaveBeenCalled();
  });

  it.each(["next", "default ledger", "unsafe next"] as const)(
    "uses the existing success flow for recovery (%s)",
    async (destination) => {
      const next = "/ledger/owner/book?view=journal#latest";
      mocks.search = {
        recovery: CHALLENGE,
        ...(destination === "next"
          ? { next }
          : destination === "unsafe next"
            ? { next: "https://evil.example/login" }
            : {}),
      };
      if (destination === "default ledger")
        mocks.getDefaultLedger.mockResolvedValue({ id: "owner/book" });
      const sessionStorageWrite = vi.spyOn(Storage.prototype, "setItem");
      const api = network();
      render(api.page());
      const user = await credentials();
      await user.click(
        screen.getByRole("button", { name: "Verify and sign in" }),
      );
      await waitFor(() => expect(api.pending).toHaveLength(1));
      expect(api.pending[0]).toMatchObject({
        name: "SignInWithEmailCode",
        variables: {
          email: EMAIL,
          password: PASSWORD,
          code: CODE,
          challengeId: CHALLENGE,
        },
      });
      await act(async () => api.pending[0].succeed(session));
      expect(mocks.postMobile).toHaveBeenCalledExactlyOnceWith(
        "synthetic-session-token",
        "password",
      );
      if (destination === "next") {
        expect(mocks.hardNavigate).toHaveBeenCalledExactlyOnceWith(next);
        expect(mocks.getDefaultLedger).not.toHaveBeenCalled();
      } else {
        expect(mocks.hardNavigate).not.toHaveBeenCalled();
        expect(mocks.navigate).toHaveBeenCalledExactlyOnceWith({
          to:
            destination === "default ledger"
              ? "/ledger/owner/book"
              : "/auth/welcome",
        });
      }
      expect(localStorage.setItem).not.toHaveBeenCalled();
      expect(sessionStorageWrite).not.toHaveBeenCalled();
      for (const secret of [EMAIL, PASSWORD, CODE, "synthetic-session-token"])
        expect(window.location.href).not.toContain(secret);
    },
  );

  it("does not duplicate a proof when two native submit events arrive before validation settles", async () => {
    const api = network();
    render(api.recovery({ challengeId: CHALLENGE }));
    await credentials();
    const form = screen
      .getByRole("button", { name: "Verify and sign in" })
      .closest("form")!;
    await act(async () => {
      fireEvent.submit(form);
      fireEvent.submit(form);
    });
    expect(api.pending).toHaveLength(1);
    await act(async () => api.pending[0].succeed(session));
    expect(api.pending).toHaveLength(1);
  });

  it("shows one generic refusal for wrong or expired proofs and keeps raw server prose private", async () => {
    const api = network();
    render(api.recovery({ challengeId: CHALLENGE }));
    const user = await credentials();
    await user.click(
      screen.getByRole("button", { name: "Verify and sign in" }),
    );
    await waitFor(() => expect(api.pending).toHaveLength(1));
    await act(async () => api.pending[0].refuse("BAD_USER_INPUT"));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The email, code or password is incorrect, or the code has expired.",
    );
    expect(document.body).not.toHaveTextContent(
      "synthetic private provider detail",
    );
    expect(mocks.postMobile).not.toHaveBeenCalled();
  });

  it("keeps cooldown and retry-at states bounded and cleans their timers on unmount", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));
    const api = network();
    const view = render(api.recovery({ initialEmail: EMAIL }));
    const send = screen.getByRole("button", { name: "Send recovery email" });
    await act(async () => {
      fireEvent.click(send);
    });
    expect(api.pending).toHaveLength(1);
    await act(async () =>
      api.pending[0].succeed({ requestSignInRecovery: { success: true } }),
    );
    expect(
      screen.getByRole("button", { name: "Send another recovery email" }),
    ).toBeDisabled();
    expect(screen.getByText(/Try again at/)).toHaveTextContent(
      new Intl.DateTimeFormat("en", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
      }).format(Date.now() + 60_000),
    );
    await act(async () => {
      vi.advanceTimersByTime(59_999);
    });
    expect(
      screen.getByRole("button", { name: "Send another recovery email" }),
    ).toBeDisabled();
    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    const resend = screen.getByRole("button", {
      name: "Send another recovery email",
    });
    expect(resend).toBeEnabled();
    expect(api.pending).toHaveLength(1);
    await act(async () => {
      fireEvent.click(resend);
    });
    expect(api.pending).toHaveLength(2);
    await act(async () => api.pending[1].refuse("SERVICE_UNAVAILABLE", 5));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Sign-in is temporarily unavailable.",
    );
    expect(
      screen.getByRole("button", { name: "Send another recovery email" }),
    ).toBeDisabled();
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(
      screen.getByRole("button", { name: "Send another recovery email" }),
    ).toBeEnabled();
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Send another recovery email" }),
      );
    });
    await act(async () =>
      api.pending[2].succeed({ requestSignInRecovery: { success: true } }),
    );
    view.unmount();
    api.client.stop();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([undefined, CHALLENGE])(
    "keeps credential submissions in POST and disabled before hydration (challenge=%s)",
    (challengeId) => {
      const api = network();
      const html = renderToString(api.recovery({ challengeId }));
      const root = document.createElement("div");
      root.innerHTML = html;
      const form = root.querySelector("form")!;
      expect(form).toHaveAttribute("method", "post");
      expect(form.querySelector('button[type="submit"]')).toBeDisabled();
      expect(html).toContain("<noscript>");
      if (challengeId) {
        expect(form.querySelector('input[type="password"]')).not.toBeNull();
        expect(
          form.querySelector('input[autocomplete="one-time-code"]'),
        ).not.toBeNull();
      }
      expect(api.pending).toHaveLength(0);
    },
  );
});
