import { makeVar } from "@apollo/client";

export const EXAMPLE_IDS = [
  "open_ledger/example",
  "open_ledger/nvidia",
  "open_ledger/crypto-example",
] as const;

export type ExampleId = (typeof EXAMPLE_IDS)[number];
export type GuestView =
  "home" | "accounts" | "transactions" | "reports" | "files";
export type GuestReadFailure = "unavailable" | "connection";
export type GuestVisit = {
  serverUrl: string;
  ledgerId: ExampleId | null;
  view: GuestView;
  resumeFailure?: GuestReadFailure;
};

// Public selections only. Neither this state nor the guest cache is persisted;
// a new launch starts at Welcome, never at a previously authenticated ledger.
export const guestVisitVar = makeVar<GuestVisit | null>(null);
let continuation: {
  visit: GuestVisit;
  state: string | null;
  startedAt: number;
} | null = null;

export function startGuestVisit(serverUrl: string): void {
  continuation = null;
  guestVisitVar({ serverUrl, ledgerId: null, view: "home" });
}

export function updateGuestVisit(
  update: Partial<Pick<GuestVisit, "ledgerId" | "view" | "resumeFailure">>,
): void {
  const visit = guestVisitVar();
  if (visit) {
    continuation = null;
    guestVisitVar({ ...visit, ...update });
  }
}

export function clearGuestVisit(): void {
  continuation = null;
  guestVisitVar(null);
}

export function beginGuestSignIn(): void {
  const visit = guestVisitVar();
  continuation = visit?.ledgerId
    ? { visit, state: null, startedAt: Date.now() }
    : null;
}

export function endGuestSignIn(): void {
  continuation = null;
}

/** Bind the selected view to the actual OAuth attempt, not just the next login. */
export function bindGuestAuthorization(serverUrl: string, state: string): void {
  if (continuation?.visit.serverUrl === serverUrl && !continuation.state) {
    continuation.state = state;
  }
}

export function guestContinuation(
  serverUrl: string,
  state: string,
): GuestVisit | null {
  if (
    !continuation ||
    continuation.state !== state ||
    continuation.visit.serverUrl !== serverUrl ||
    continuation.visit !== guestVisitVar() ||
    Date.now() - continuation.startedAt > 10 * 60 * 1000
  )
    return null;
  return continuation.visit;
}
