import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
} from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import GeneralSettingsPage from "../index";

vi.mock("@/common/components/seo/page-seo", () => ({ PageSEO: () => null }));
vi.mock(
  "@/common/providers/react-native-bridge-provider/react-native-bridge-context",
  () => ({
    useReactNativeContext: () => ({ isReactNative: true }),
  }),
);
vi.mock("../user-profile-section", () => ({
  UserProfileSection: ({
    userData,
  }: {
    userData?: { me?: { username?: string } };
  }) => (
    <section aria-label="User profile">
      {userData?.me?.username ?? "profile"}
    </section>
  ),
}));
vi.mock("../appearance-section", () => ({ AppearanceSection: () => null }));
vi.mock("../session-section", () => ({ SessionSection: () => null }));
vi.mock("../billing-summary-link", () => ({ BillingSummaryLink: () => null }));

/** A failed General Settings read offers an in-place retry (w4/257). */
describe("General Settings read failure", () => {
  it("retries the failed read from the keyboard and shows the profile", async () => {
    let calls = 0;
    const client = new ApolloClient({
      cache: new InMemoryCache(),
      link: new ApolloLink(
        () =>
          new Observable((observer) => {
            calls += 1;
            if (calls === 1) {
              observer.error(new Error("Failed to fetch"));
              return;
            }
            observer.next({ data: { me: null } });
            observer.complete();
          }),
      ),
    });
    render(
      <ApolloProvider client={client}>
        <GeneralSettingsPage />
      </ApolloProvider>,
    );

    const retry = await screen.findByRole("button", { name: "Try Again" });
    expect(screen.queryByRole("region", { name: "User profile" })).toBeNull();
    retry.focus();
    await userEvent.setup().keyboard("{Enter}");

    expect(
      await screen.findByRole("region", { name: "User profile" }),
    ).toBeInTheDocument();
    expect(calls).toBe(2);
  });
  it("keeps the failure busy through a retry and hands focus back when it fails again", async () => {
    const user = userEvent.setup();
    let calls = 0;
    const held: ((ok: boolean) => void)[] = [];
    const client = new ApolloClient({
      cache: new InMemoryCache(),
      link: new ApolloLink(
        () =>
          new Observable((observer) => {
            calls += 1;
            const settle = (ok: boolean) => {
              if (!ok) return observer.error(new TypeError("Failed to fetch"));
              observer.next({ data: { me: null } });
              observer.complete();
            };
            if (calls === 1) settle(false);
            else held.push(settle);
          }),
      ),
    });
    render(
      <ApolloProvider client={client}>
        <GeneralSettingsPage />
      </ApolloProvider>,
    );

    const retry = await screen.findByRole("button", { name: "Try Again" });
    const reason = screen.getByText(/connection problem/i);
    retry.focus();
    await user.keyboard("{Enter}");
    await waitFor(() => expect(calls).toBe(2));
    // The failure and its reason stay while the retry is pending (w4/983).
    expect(retry).toBeDisabled();
    expect(reason).toBeInTheDocument();
    await user.keyboard("{Enter}");
    expect(calls).toBe(2);
    // A browser drops focus from the disabled control; jsdom keeps it.
    const away = document.createElement("button");
    document.body.appendChild(away);
    away.focus();
    away.remove();

    held.shift()!(false);
    await waitFor(() => expect(retry).toHaveFocus());
    await user.keyboard("{Enter}");
    await waitFor(() => expect(calls).toBe(3));
    held.shift()!(true);
    expect(
      await screen.findByRole("region", { name: "User profile" }),
    ).toBeInTheDocument();
  });
});
