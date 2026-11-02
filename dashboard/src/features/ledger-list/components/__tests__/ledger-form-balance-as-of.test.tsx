import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

const originalTz = process.env.TZ;

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

afterEach(() => {
  vi.useRealTimers();
  process.env.TZ = originalTz;
});

/** Opens the details of the default (personal) purpose. */
function details(onSubmit = vi.fn()) {
  render(<LedgerForm onSubmit={onSubmit} onCancel={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
}

/** Gives Assets:Cash a known balance, which brings up its "as of" date. */
function knownBalance() {
  fireEvent.change(screen.getByTestId("ledger-opening-account"), {
    target: { value: "Assets:Cash" },
  });
  fireEvent.change(screen.getByTestId("ledger-opening-amount"), {
    target: { value: "100" },
  });
  return screen.getByLabelText("Balance as of") as HTMLInputElement;
}

/**
 * The flow never asks when the books begin: a known balance's date is the
 * history start, and it defaults to the reader's own day (ADR021, w4/317).
 */
describe("LedgerForm balance as of", () => {
  it("asks for no date until a balance is known", () => {
    details();
    expect(screen.queryByLabelText("Books begin")).toBeNull();
    expect(screen.queryByLabelText("Balance as of")).toBeNull();
    knownBalance();
    expect(screen.getByLabelText("Balance as of")).toBeInTheDocument();
  });

  it.each([
    // 21:30 on the 21st in Los Angeles is already the 22nd in UTC.
    ["America/Los_Angeles", "2026-10-22T04:30:00Z", "2026-10-21"],
    // 01:30 on the 22nd in Tokyo is still the 21st in UTC.
    ["Asia/Tokyo", "2026-10-21T16:30:00Z", "2026-10-22"],
    ["UTC", "2026-10-22T04:30:00Z", "2026-10-22"],
  ])("defaults to the local day in %s", (zone, instant, day) => {
    process.env.TZ = zone;
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(instant));
    details();
    expect(knownBalance()).toHaveValue(day);
  });

  it("sends the as-of date as historyStart, kept through Back", async () => {
    process.env.TZ = "America/Los_Angeles";
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-22T04:30:00Z"));
    const onSubmit = vi.fn();
    details(onSubmit);
    fireEvent.change(knownBalance(), { target: { value: "2026-01-01" } });

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    // The amount is re-entered after leaving the step; the date is kept.
    fireEvent.change(screen.getByTestId("ledger-opening-amount"), {
      target: { value: "100" },
    });
    expect(screen.getByLabelText("Balance as of")).toHaveValue("2026-01-01");

    fireEvent.click(screen.getByRole("button", { name: "Create Ledger" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].setup).toMatchObject({
      historyStart: "2026-01-01",
      accounts: [{ name: "Assets:Cash", amount: "100" }],
    });
  });

  it("starts the books on the local day when no balance is known", async () => {
    process.env.TZ = "America/Los_Angeles";
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-22T04:30:00Z"));
    const onSubmit = vi.fn();
    details(onSubmit);
    fireEvent.click(screen.getByRole("button", { name: "Create Ledger" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].setup).toMatchObject({
      historyStart: "2026-10-21",
    });
    expect(onSubmit.mock.calls[0][0].setup.accounts).toBeUndefined();
  });
});
