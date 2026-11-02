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

beforeEach(() => {
  sessionStorage.clear();
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
const review = () => screen.queryByTestId("ledger-create-review");

/** Only Review's Create Ledger creates the ledger (w4/314). */
describe("LedgerForm review step", () => {
  it("reaches Review by pointer and keyboard without creating, then creates once on confirm", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<LedgerForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.click(button("Next"));
    const detailsNext = button("Next");
    await user.click(detailsNext);
    expect(review()).toBeInTheDocument();
    // A browser runs the click's default action after React re-renders, so a
    // Next node reused as the submit button would create the ledger. jsdom
    // does not order it that way; the node identity is what must hold.
    expect(button("Create Ledger")).not.toBe(detailsNext);
    expect(detailsNext).not.toBeInTheDocument();

    await user.click(button("Back"));
    button("Next").focus();
    await user.keyboard("{Enter}");
    expect(review()).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    await user.click(button("Create Ledger"));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      name: "my-book",
      requestId: expect.any(String),
    });
  });

  it("advances instead of creating when Details is submitted from a field", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<LedgerForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.click(button("Next"));
    screen.getByLabelText("Ledger Name").closest("form")!.requestSubmit();
    await waitFor(() => expect(review()).toBeInTheDocument());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  /** The starting point Review names. */
  const reviewed = () =>
    within(review()!).getByText("Template").nextElementSibling?.textContent;

  it("names the chosen starting point, not a preset kept from earlier (w4/315)", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<LedgerForm onSubmit={onSubmit} onCancel={vi.fn()} />);
    const toReview = async () => {
      await user.click(button("Next"));
      await user.click(button("Next"));
    };
    const toStart = async () => {
      await user.click(button("Back"));
      await user.click(button("Back"));
    };

    await toReview();
    expect(reviewed()).toBe("Starter template");

    await toStart();
    await user.click(screen.getByRole("radio", { name: /^Template/ }));
    await user.click(screen.getByRole("radio", { name: /^Freelance ledger/ }));
    await toReview();
    expect(reviewed()).toBe("Freelance ledger");

    await toStart();
    await user.click(screen.getByRole("radio", { name: /^Sample ledger/ }));
    await toReview();
    expect(reviewed()).toBe("Sample ledger");
    await user.click(button("Create Ledger"));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ template: "SAMPLE" });
    expect(onSubmit.mock.calls[0][0].setup).toBeUndefined();

    await toStart();
    await user.click(screen.getByRole("radio", { name: /^Starter template/ }));
    await toReview();
    expect(reviewed()).toBe("Starter template");

    // Switching back to a preset keeps the one chosen before.
    await toStart();
    await user.click(screen.getByRole("radio", { name: /^Template/ }));
    await toReview();
    expect(reviewed()).toBe("Freelance ledger");
  });

  /** Details' opening balance controls and Review's opening row. */
  const openingAccount = () =>
    screen.getByTestId("ledger-opening-account") as HTMLSelectElement;
  const openingAmount = () =>
    screen.getByTestId("ledger-opening-amount") as HTMLInputElement;
  const reviewedOpening = () =>
    within(review()!).getByText("Opening account").nextElementSibling
      ?.textContent;

  it("sends only an opening account the chosen preset offers (w4/316)", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<LedgerForm onSubmit={onSubmit} onCancel={vi.fn()} />);
    const toStart = async () => {
      await user.click(button("Back"));
      await user.click(button("Back"));
    };

    await user.click(screen.getByRole("radio", { name: /^Template/ }));
    await user.click(button("Next"));
    // No amount without an account to hold it.
    expect(openingAmount()).toBeDisabled();
    await user.selectOptions(openingAccount(), "Assets:Bank");
    await user.type(openingAmount(), "2500");

    // Freelance also offers Assets:Bank: the choice stays.
    await user.click(button("Back"));
    await user.click(screen.getByRole("radio", { name: /^Freelance ledger/ }));
    await user.click(button("Next"));
    expect(openingAccount()).toHaveValue("Assets:Bank");
    expect(openingAmount()).toHaveValue("2500");
    await user.click(button("Next"));
    expect(reviewedOpening()).toBe("Assets:Bank · 2500 USD");

    // Portfolio does not: account and amount are both dropped.
    await toStart();
    await user.click(screen.getByRole("radio", { name: /^Portfolio ledger/ }));
    await user.click(button("Next"));
    expect(openingAccount()).toHaveValue("");
    expect(openingAmount()).toHaveValue("");
    expect(openingAmount()).toBeDisabled();
    await user.click(button("Next"));
    expect(reviewedOpening()).toBe("Decide later");
    await user.click(button("Create Ledger"));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].setup).toMatchObject({
      preset: "PORTFOLIO",
    });
    expect(onSubmit.mock.calls[0][0].setup.accounts).toBeUndefined();
  });

  it("clears an amount when its account goes back to Decide later (w4/316)", async () => {
    const user = userEvent.setup();
    render(<LedgerForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    await user.click(screen.getByRole("radio", { name: /^Template/ }));
    await user.click(button("Next"));
    await user.selectOptions(openingAccount(), "Assets:Cash");
    await user.type(openingAmount(), "40");
    await user.selectOptions(openingAccount(), "");
    expect(openingAmount()).toHaveValue("");
    expect(openingAmount()).toBeDisabled();
  });
});
