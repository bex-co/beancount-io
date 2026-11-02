import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as apolloClient from "@apollo/client/react";
import {
  GetCurrentUserDocument,
  UpdateDefaultCurrencyDocument,
} from "@/graphql/definitions";
import { createMockQueryResult } from "@/test/apollo-test-utils";
import { LedgerForm } from "../ledger-form";

vi.mock("@apollo/client/react", () => ({
  useMutation: vi.fn(),
  useQuery: vi.fn(),
  useLazyQuery: vi.fn(() => [
    vi.fn(async () => ({ data: undefined })),
    { data: undefined, loading: false, error: undefined },
  ]),
}));
vi.mock(
  "@/common/providers/react-native-bridge-provider/react-native-bridge-context",
  () => ({ useReactNativeContext: () => ({ isReactNative: false }) }),
);
vi.mock("@tanstack/react-router", async () => {
  const { routerMock } = await import("@/test/mocks/router");
  return routerMock;
});

const saveCurrency = vi.fn(async () => ({ data: undefined }));

/** A signed-in profile whose saved preference is `saved`. */
function signedIn(saved: string | null) {
  vi.mocked(apolloClient.useQuery).mockImplementation(((document: unknown) =>
    createMockQueryResult({
      data:
        document === GetCurrentUserDocument
          ? {
              userProfile: {
                __typename: "UserProfileResponse",
                id: "user-1",
                tier: "FREE",
                username: "owner",
                email: "owner@example.test",
                firstName: null,
                lastName: null,
                locale: "en",
                defaultCurrency: saved,
                emailReportStatus: null,
                limits: {
                  __typename: "UserLimits",
                  ledgersUsed: 0,
                  ledgersMax: 5,
                  collaboratorsPerLedgerMax: 1,
                },
              },
            }
          : { listLedgers: [] },
    })) as never);
}

beforeEach(() => {
  sessionStorage.clear();
  saveCurrency.mockClear();
  vi.mocked(apolloClient.useMutation).mockImplementation(((
    document: unknown,
  ) => [
    document === UpdateDefaultCurrencyDocument ? saveCurrency : vi.fn(),
    { loading: false },
  ]) as never);
});

const button = (name: string) => screen.getByRole("button", { name });
const currency = () => screen.getByTestId("ledger-currency-input");

/** The saved preference and its write rule in the form (ADR026). */
describe("LedgerForm currency preference", () => {
  it("preselects the saved preference and labels it", async () => {
    signedIn("CHF");
    const user = userEvent.setup();
    render(<LedgerForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    await user.click(button("Next"));
    expect(currency()).toHaveValue("CHF");
    expect(screen.getByTestId("ledger-currency-source")).toHaveTextContent(
      "From your saved preference",
    );
  });

  it("saves a changed currency once the ledger is created", async () => {
    signedIn("CHF");
    const user = userEvent.setup();
    render(
      <LedgerForm onSubmit={vi.fn(async () => true)} onCancel={vi.fn()} />,
    );
    await user.click(button("Next"));
    await user.clear(currency());
    await user.type(currency(), "eur");
    expect(screen.queryByTestId("ledger-currency-source")).toBeNull();
    await user.click(button("Create Ledger"));
    await waitFor(() =>
      expect(saveCurrency).toHaveBeenCalledWith({
        variables: { defaultCurrency: "EUR" },
      }),
    );
  });

  it("leaves a saved preference alone when its suggestion is accepted", async () => {
    signedIn("CHF");
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => true);
    render(<LedgerForm onSubmit={onSubmit} onCancel={vi.fn()} />);
    await user.click(button("Next"));
    await user.click(button("Create Ledger"));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0].setup.operatingCurrency).toBe("CHF");
    expect(saveCurrency).not.toHaveBeenCalled();
  });

  it("seeds the preference from the first accepted suggestion", async () => {
    signedIn(null);
    const user = userEvent.setup();
    render(
      <LedgerForm onSubmit={vi.fn(async () => true)} onCancel={vi.fn()} />,
    );
    await user.click(button("Next"));
    const suggested = (currency() as HTMLInputElement).value;
    await user.click(button("Create Ledger"));
    await waitFor(() =>
      expect(saveCurrency).toHaveBeenCalledWith({
        variables: { defaultCurrency: suggested },
      }),
    );
  });

  it("saves nothing when the create fails, or for the example ledger", async () => {
    signedIn(null);
    const user = userEvent.setup();
    render(
      <LedgerForm onSubmit={vi.fn(async () => false)} onCancel={vi.fn()} />,
    );
    await user.click(button("Next"));
    await user.click(button("Create Ledger"));
    await user.click(button("Back"));
    await user.click(screen.getByRole("radio", { name: /^Sample ledger/ }));
    await user.click(button("Next"));
    await user.click(button("Create Ledger"));
    expect(saveCurrency).not.toHaveBeenCalled();
  });
});
