import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LedgerForm } from "../ledger-form";
import { GetCurrentUserDocument, LedgerTemplate } from "@/graphql/definitions";
import * as apolloClient from "@apollo/client/react";
import { createMockQueryResult } from "@/test/apollo-test-utils";

vi.mock("@apollo/client/react", () => ({
  useQuery: vi.fn(),
}));

vi.mock(
  "@/common/providers/react-native-bridge-provider/react-native-bridge-context",
  () => ({
    useReactNativeContext: () => ({ isReactNative: false }),
  }),
);

/**
 * w3/m62: the create form's one Currency field. It opens on the saved
 * preference, else the browser region's currency, else USD; only a Starter
 * sends it, and USD is left out so the request stays the one installed
 * clients and older servers already exchange.
 */
describe("LedgerForm currency (w3/m62)", () => {
  const onSubmit = vi.fn();

  const mockProfile = (defaultCurrency: string | null) => {
    vi.mocked(apolloClient.useQuery).mockImplementation(
      (document: unknown): unknown =>
        document === GetCurrentUserDocument
          ? createMockQueryResult({
              data: {
                userProfile: {
                  __typename: "UserProfileResponse",
                  id: "user-1",
                  tier: "FREE",
                  defaultCurrency,
                  limits: {
                    __typename: "UserLimits",
                    ledgersUsed: 0,
                    ledgersMax: 5,
                    collaboratorsPerLedgerMax: 2,
                    maxDirectives: 1000,
                  },
                },
              },
            })
          : createMockQueryResult({ data: { listLedgers: [] } }),
    );
  };

  const mockLanguages = (languages: string[]) =>
    vi.spyOn(navigator, "languages", "get").mockReturnValue(languages);

  // The open popup and its list are named after the field too (w2/116).
  const currencyInput = () =>
    screen.getByRole("combobox", { name: "Currency" }) as HTMLInputElement;

  const submit = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole("button", { name: "Create Ledger" }));
  };

  beforeEach(() => {
    mockProfile(null);
    mockLanguages(["en-US", "en"]);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("opens on the saved preference before the browser region", async () => {
    mockProfile("JPY");
    mockLanguages(["de-DE"]);
    render(<LedgerForm onSubmit={onSubmit} />);
    await waitFor(() => expect(currencyInput()).toHaveValue("JPY"));
  });

  it("opens on the browser region's currency when nothing is saved", async () => {
    mockLanguages(["en-GB", "en"]);
    render(<LedgerForm onSubmit={onSubmit} />);
    await waitFor(() => expect(currencyInput()).toHaveValue("GBP"));
  });

  it("takes the region, never the language, and falls back to USD", async () => {
    mockProfile("XYZ");
    mockLanguages(["fr"]);
    render(<LedgerForm onSubmit={onSubmit} />);
    await waitFor(() => expect(currencyInput()).toHaveValue("USD"));
  });

  it("sends the prefilled currency with a Starter", async () => {
    const user = userEvent.setup();
    mockLanguages(["de-DE"]);
    render(<LedgerForm onSubmit={onSubmit} />);
    await waitFor(() => expect(currencyInput()).toHaveValue("EUR"));
    await submit(user);
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        name: "my-book",
        description: undefined,
        private: true,
        currency: "EUR",
      }),
    );
  });

  it("sends a currency picked from the list", async () => {
    const user = userEvent.setup();
    render(<LedgerForm onSubmit={onSubmit} />);
    await waitFor(() => expect(currencyInput()).toHaveValue("USD"));
    await user.clear(currencyInput());
    await user.type(currencyInput(), "CHF");
    await user.click(await screen.findByRole("option", { name: /^CHF/ }));
    await submit(user);
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ currency: "CHF" }),
      ),
    );
  });

  it("leaves USD out, so the request is the one sent before the field", async () => {
    const user = userEvent.setup();
    render(<LedgerForm onSubmit={onSubmit} />);
    await waitFor(() => expect(currencyInput()).toHaveValue("USD"));
    await submit(user);
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        name: "my-book",
        description: undefined,
        private: true,
      }),
    );
  });

  it("hides the field for the Sample ledger and sends no currency", async () => {
    const user = userEvent.setup();
    mockProfile("EUR");
    render(<LedgerForm onSubmit={onSubmit} />);
    await waitFor(() => expect(currencyInput()).toHaveValue("EUR"));
    await user.click(screen.getByRole("radio", { name: /Sample ledger/i }));
    expect(screen.queryByLabelText("Currency")).not.toBeInTheDocument();
    await submit(user);
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        name: "my-book",
        description: undefined,
        private: true,
        template: LedgerTemplate.Sample,
      }),
    );
  });

  it("refuses an emptied currency instead of sending it", async () => {
    const user = userEvent.setup();
    render(<LedgerForm onSubmit={onSubmit} />);
    await waitFor(() => expect(currencyInput()).toHaveValue("USD"));
    await user.click(screen.getByRole("button", { name: /clear/i }));
    await submit(user);
    expect(
      await screen.findByText("Choose a currency from the list."),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("does not hold back a Sample over the hidden currency", async () => {
    const user = userEvent.setup();
    render(<LedgerForm onSubmit={onSubmit} />);
    await waitFor(() => expect(currencyInput()).toHaveValue("USD"));
    await user.click(screen.getByRole("button", { name: /clear/i }));
    await user.click(screen.getByRole("radio", { name: /Sample ledger/i }));
    await submit(user);
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ template: LedgerTemplate.Sample }),
      ),
    );
  });

  it("is a create-only field: editing shows Save and no currency", () => {
    render(
      <LedgerForm initialData={{ name: "existing" }} onSubmit={onSubmit} />,
    );
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Currency")).not.toBeInTheDocument();
  });
});
