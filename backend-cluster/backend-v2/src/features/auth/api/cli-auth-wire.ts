import type { CliAuthSessionStatus } from "@/features/auth/data/cli-auth-session-model/types";

/**
 * The CLI auth ceremony's wire vocabulary, shared by both transport adapters
 * (GraphQL resolver and REST routes) so they cannot drift: one status set, one
 * persisted→wire mapping, one "missing session reads as EXPIRED" rule.
 */

export const CLI_AUTH_WIRE_STATUSES = [
  "PENDING",
  "AUTHORIZED",
  "DENIED",
  "EXPIRED",
  "CONSUMED",
] as const;

export type CliAuthWireStatus = (typeof CLI_AUTH_WIRE_STATUSES)[number];

const STATUS_TO_WIRE: Record<CliAuthSessionStatus, CliAuthWireStatus> = {
  pending: "PENDING",
  authorized: "AUTHORIZED",
  denied: "DENIED",
  consumed: "CONSUMED",
};

/** A missing session and an unrecognized device code are the same answer. */
export function toCliAuthWireStatus(
  status: CliAuthSessionStatus | null,
): CliAuthWireStatus {
  return status ? STATUS_TO_WIRE[status] : "EXPIRED";
}

/**
 * Best-effort address of the requesting device, for display on the consent
 * screen. Client-controlled (2026 security review, finding 7), so it is shown
 * as a hint and never used to decide anything.
 */
export function firstForwardedIp(header: string | undefined): string | undefined {
  return header?.split(",")[0]?.trim() || undefined;
}
