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

/** Opens the Template path's details, where Books begin is set. */
function presetDetails(onSubmit = vi.fn()) {
  render(<LedgerForm onSubmit={onSubmit} onCancel={vi.fn()} />);
  fireEvent.click(screen.getByRole("radio", { name: /^Template/ }));
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  return screen.getByLabelText("Books begin") as HTMLInputElement;
}

/** Books begin defaults to the reader's own calendar day (w4/317). */
describe("LedgerForm Books begin", () => {
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
    expect(presetDetails()).toHaveValue(day);
  });

  it("keeps an explicit date through Back and into the setup sent", async () => {
    process.env.TZ = "America/Los_Angeles";
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-22T04:30:00Z"));
    const onSubmit = vi.fn();
    const input = presetDetails(onSubmit);
    fireEvent.change(input, { target: { value: "2026-01-01" } });

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByLabelText("Books begin")).toHaveValue("2026-01-01");

    // Details validates the name before Review appears.
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Create Ledger" }),
    );
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].setup).toMatchObject({
      historyStart: "2026-01-01",
    });
  });
});
