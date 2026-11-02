import { render, screen } from "@testing-library/react";
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

/** The signed-in profile's tier and owned-ledger allowance. */
function signedIn(tier: string, ledgersUsed: number, ledgersMax: number) {
  vi.mocked(apolloClient.useQuery).mockImplementation(((document: unknown) =>
    createMockQueryResult({
      data:
        document === GetCurrentUserDocument
          ? {
              userProfile: {
                __typename: "UserProfileResponse",
                id: "user-1",
                tier,
                username: "owner",
                email: "owner@example.test",
                firstName: null,
                lastName: null,
                locale: "en",
                emailReportStatus: null,
                limits: {
                  __typename: "UserLimits",
                  ledgersUsed,
                  ledgersMax,
                  collaboratorsPerLedgerMax: -1,
                },
              },
            }
          : { listLedgers: [] },
    })) as never);
}

const next = () => screen.getByRole("button", { name: "Next" });

/** An unlimited (-1) ledger allowance never reads as exhausted (w4/313). */
describe("LedgerForm ledger allowance", () => {
  // The wizard resumes a saved draft; each case starts at step one.
  beforeEach(() => sessionStorage.clear());

  it.each([0, 3])(
    "advances to details with %i owned ledgers under an unlimited allowance",
    async (used) => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      signedIn("ENTERPRISE", used, -1);
      render(<LedgerForm onSubmit={onSubmit} onCancel={vi.fn()} />);

      expect(screen.queryByText("Ledger Limit Reached")).toBeNull();
      expect(screen.queryByText(/-1/)).toBeNull();
      expect(next()).toBeEnabled();

      await user.click(next());
      expect(screen.getByLabelText("Ledger Name")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Create Ledger" }),
      ).toBeEnabled();
      expect(onSubmit).not.toHaveBeenCalled();
    },
  );

  it("still advances below a finite cap", () => {
    signedIn("GROWTH", 0, 20);
    render(<LedgerForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect(next()).toBeEnabled();
  });

  it.each([
    ["at", "GROWTH", 20, 20],
    ["over", "GROWTH", 21, 20],
    ["at a zero", "FREE", 0, 0],
  ])("stops %s a finite cap", (_where, tier, used, max) => {
    signedIn(tier, used, max);
    render(<LedgerForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText("Ledger Limit Reached")).toBeInTheDocument();
    expect(next()).toBeDisabled();
  });
});
