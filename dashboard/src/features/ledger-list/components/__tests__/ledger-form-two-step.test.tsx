import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as apolloClient from "@apollo/client/react";
import { GetCurrentUserDocument } from "@/graphql/definitions";
import { createMockQueryResult } from "@/test/apollo-test-utils";
import { LedgerForm } from "../ledger-form";

vi.mock("@apollo/client/react", () => ({
  useMutation: vi.fn(() => [vi.fn(async () => ({})), { loading: false }]),
  useQuery: vi.fn(),
  useLazyQuery: vi.fn(),
}));
vi.mock(
  "@/common/providers/react-native-bridge-provider/react-native-bridge-context",
  () => ({ useReactNativeContext: () => ({ isReactNative: false }) }),
);
vi.mock("@tanstack/react-router", async () => {
  const { routerMock } = await import("@/test/mocks/router");
  return routerMock;
});

/** The builder's answer the summary shows: what `previewLedgerSetup` returns. */
const PREVIEW_ACCOUNTS = ["Assets:Bank", "Assets:Cash", "Income:General"];
const runPreview = vi.fn(async () => ({ data: undefined }));

beforeEach(() => {
  sessionStorage.clear();
  runPreview.mockClear();
  vi.mocked(apolloClient.useLazyQuery).mockImplementation((() => [
    runPreview,
    {
      data: { previewLedgerSetup: { accounts: PREVIEW_ACCOUNTS, files: {} } },
      loading: false,
      error: undefined,
    },
  ]) as never);
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
                emailReportStatus: null,
                limits: {
                  __typename: "UserLimits",
                  ledgersUsed: 0,
                  ledgersMax: 1,
                  collaboratorsPerLedgerMax: 1,
                },
              },
            }
          : { listLedgers: [] },
    })) as never);
});

const button = (name: string) => screen.getByRole("button", { name });
const summary = () => screen.queryByTestId("ledger-create-summary");
const summaryLine = () => summary()!.querySelector("summary")!.textContent;
const radio = (name: RegExp) => screen.getByRole("radio", { name });

/** Purpose, then details and Create ledger: no review page (ADR021). */
describe("LedgerForm two-step creation", () => {
  it("creates only from Create ledger, by pointer or keyboard (w4/314)", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<LedgerForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    expect(screen.getByTestId("ledger-create-step")).toHaveTextContent(
      "Step 1 of 2",
    );
    const purposeNext = button("Next");
    await user.click(purposeNext);
    expect(screen.getByLabelText("Ledger Name")).toBeInTheDocument();
    expect(screen.queryByTestId("ledger-create-review")).toBeNull();
    // A browser runs the click's default action after React re-renders, so a
    // Next node reused as the submit button would create the ledger. jsdom
    // does not order it that way; the node identity is what must hold.
    expect(button("Create Ledger")).not.toBe(purposeNext);
    expect(purposeNext).not.toBeInTheDocument();

    await user.click(button("Back"));
    // Enter on a purpose advances; it never creates.
    radio(/^Personal ledger/)
      .closest("form")!
      .requestSubmit();
    await waitFor(() =>
      expect(screen.getByLabelText("Ledger Name")).toBeInTheDocument(),
    );
    expect(onSubmit).not.toHaveBeenCalled();

    await user.click(button("Create Ledger"));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      name: "my-book",
      requestId: expect.any(String),
      setup: { preset: "PERSONAL" },
    });
  });

  it("preselects personal and never offers the retired Starter template", () => {
    render(<LedgerForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect(radio(/^Personal ledger/)).toBeChecked();
    expect(radio(/^Blank ledger/)).not.toBeChecked();
    expect(
      screen.queryByRole("radio", { name: /Starter template/ }),
    ).toBeNull();
    expect(screen.getByTestId("setup-separate-ledger-note")).toHaveTextContent(
      "belongs in its own ledger",
    );
  });

  it("sums up the chosen start beside Create ledger (w4/315)", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<LedgerForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.click(radio(/^Freelance ledger/));
    await user.click(button("Next"));
    expect(summaryLine()).toBe("Private · USD · 3 accounts");
    expect(within(summary()!).getAllByRole("listitem")).toHaveLength(3);

    await user.click(button("Back"));
    await user.click(radio(/^Sample ledger/));
    await user.click(button("Next"));
    expect(summaryLine()).toBe("Private · Sample ledger");
    await user.click(button("Create Ledger"));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ template: "SAMPLE" });
    expect(onSubmit.mock.calls[0][0].setup).toBeUndefined();
  });

  it("previews exactly the setup it would send", async () => {
    const user = userEvent.setup();
    render(<LedgerForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    await user.click(screen.getByTestId("setup-module-investments@1"));
    await user.click(button("Next"));
    await waitFor(() => expect(runPreview).toHaveBeenCalled());
    expect(runPreview.mock.calls.at(-1)![0]).toMatchObject({
      variables: {
        setup: { preset: "PERSONAL", modules: [{ id: "INVESTMENTS" }] },
      },
    });
  });

  it("warns inline when the ledger is public", async () => {
    const user = userEvent.setup();
    render(<LedgerForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    await user.click(button("Next"));
    expect(screen.queryByTestId("ledger-public-warning")).toBeNull();
    await user.click(screen.getByRole("switch"));
    expect(screen.getByTestId("ledger-public-warning")).toBeInTheDocument();
    expect(summaryLine()).toMatch(/^Public · /);
  });
});

describe("LedgerForm personal modules", () => {
  it("sends the selected modules, the rental under its property name", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<LedgerForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.click(screen.getByTestId("setup-module-rental-property@1"));
    expect(
      screen.getByTestId("setup-module-accounts-rental-property@1"),
    ).toHaveTextContent("Income:Rent:Property1");
    await user.type(screen.getByTestId("setup-property-name"), "OakSt");
    expect(
      screen.getByTestId("setup-module-accounts-rental-property@1"),
    ).toHaveTextContent("Income:Rent:OakSt");
    await user.click(screen.getByTestId("setup-module-side-business@1"));

    await user.click(button("Next"));
    await user.click(button("Create Ledger"));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].setup.modules).toEqual([
      { id: "RENTAL_PROPERTY", propertyName: "OakSt" },
      { id: "SIDE_BUSINESS" },
    ]);
  });

  it("offers modules under personal only and sends none for another purpose", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<LedgerForm onSubmit={onSubmit} onCancel={vi.fn()} />);
    await user.click(screen.getByTestId("setup-module-investments@1"));
    await user.click(radio(/^Business ledger/));
    expect(screen.queryByTestId("setup-modules")).toBeNull();
    await user.click(button("Next"));
    await user.click(button("Create Ledger"));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].setup.modules).toBeUndefined();
  });

  it("holds the purpose step on a property name that is not an account part", async () => {
    const user = userEvent.setup();
    render(<LedgerForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    await user.click(screen.getByTestId("setup-module-rental-property@1"));
    await user.type(screen.getByTestId("setup-property-name"), "Oak St");
    await user.click(button("Next"));
    expect(
      await screen.findByText(/Start with a capital letter or a digit/),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Ledger Name")).toBeNull();
  });
});

/** Details' opening balance controls (w4/316). */
describe("LedgerForm opening account", () => {
  const openingAccount = () =>
    screen.getByTestId("ledger-opening-account") as HTMLSelectElement;
  const openingAmount = () =>
    screen.getByTestId("ledger-opening-amount") as HTMLInputElement;

  it("sends only an opening account the chosen preset offers", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<LedgerForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.click(button("Next"));
    // No amount without an account to hold it.
    expect(openingAmount()).toBeDisabled();
    await user.selectOptions(openingAccount(), "Assets:Bank");
    await user.type(openingAmount(), "2500");

    // Freelance also offers Assets:Bank: the choice stays.
    await user.click(button("Back"));
    await user.click(radio(/^Freelance ledger/));
    await user.click(button("Next"));
    expect(openingAccount()).toHaveValue("Assets:Bank");
    expect(openingAmount()).toHaveValue("2500");

    // Portfolio does not: account and amount are both dropped.
    await user.click(button("Back"));
    await user.click(radio(/^Portfolio ledger/));
    await user.click(button("Next"));
    expect(openingAccount()).toHaveValue("");
    expect(openingAmount()).toHaveValue("");
    expect(openingAmount()).toBeDisabled();
    await user.click(button("Create Ledger"));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].setup).toMatchObject({
      preset: "PORTFOLIO",
    });
    expect(onSubmit.mock.calls[0][0].setup.accounts).toBeUndefined();
  });

  it("clears an amount when its account goes back to Decide later", async () => {
    const user = userEvent.setup();
    render(<LedgerForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    await user.click(button("Next"));
    await user.selectOptions(openingAccount(), "Assets:Cash");
    await user.type(openingAmount(), "40");
    await user.selectOptions(openingAccount(), "");
    expect(openingAmount()).toHaveValue("");
    expect(openingAmount()).toBeDisabled();
  });

  it("never writes the opening amount to session storage", async () => {
    const user = userEvent.setup();
    render(<LedgerForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    await user.click(button("Next"));
    await user.selectOptions(openingAccount(), "Assets:Cash");
    await user.type(openingAmount(), "1234.56");
    const draft = sessionStorage.getItem("ledger-create-draft")!;
    expect(draft).toContain("Assets:Cash");
    expect(draft).not.toContain("1234.56");
  });
});
