import type { AuthMethod, Identity } from "./identity";
import type { PlaidBackgroundProvenance } from "./authorization/authorization-contract";
import { logger } from "@/shared/logger";

const auditLogger = logger.child({ module: "audit" });

/**
 * The audit trail's emitter (ADR 0006 审计).
 *
 * Two design decisions do the work here:
 *
 * **The event type has no field for a value.** Not "we are careful not to log
 * arguments" — there is nowhere to put one. A later change that wants to record
 * "a bit more context" has to widen this interface, which is a diff a reviewer
 * sees, rather than passing an extra property into a bag.
 *
 * **Emission hooks the enforcement seams, not each verb.** Legacy scope and
 * ledger decisions emit from their shared gates; centralized-PDP decisions
 * emit from `AuthorizationService`. Coverage is therefore a property of the
 * architecture rather than of whether the author of the 137th verb remembered
 * to call an audit function.
 */
export type AuditOutcome = "allowed" | "denied" | "shadow-denied" | "error";

export interface AuditEvent {
  /**
   * Stable operation identifier: the exact transport op while handling a
   * request, or the canonical authorization action for a direct service call.
   */
  readonly op: string;
  readonly userId?: string;
  readonly method?: AuthMethod | PlaidBackgroundProvenance;
  /** The credential's id. Never its secret. */
  readonly tokenId?: string;
  /** `owner/name`, when the op names a ledger. */
  readonly ledgerId?: string;
  readonly outcome: AuditOutcome;
  readonly at: Date;
}

/** Where events are persisted. Installed at composition time. */
export type AuditSink = (event: AuditEvent) => Promise<void>;

let sink: AuditSink | undefined;

/**
 * Install the durable sink. Until this is called — and in every unit test that
 * never calls it — events go to the log only, which is the right default: the
 * emitter must never be the reason a request fails.
 */
export function setAuditSink(next: AuditSink | undefined): void {
  sink = next;
}

/** The caller's fields, extracted the one way. */
export const auditSubject = (
  identity: Identity | undefined,
): Pick<AuditEvent, "userId" | "method" | "tokenId"> => ({
  userId: identity?.userId,
  method: identity?.method,
  tokenId: identity?.tokenId,
});

/**
 * Record an event. Never throws and never blocks the request: an audit trail
 * that can take the API down with it would be turned off within a week, and an
 * audit trail that is off records nothing at all.
 */
export function emitAuditEvent(event: AuditEvent): void {
  auditLogger.info("audit", event);
  if (!sink) return;
  void sink(event).catch((err) => {
    auditLogger.error("Failed to persist audit event", {
      op: event.op,
      error: err instanceof Error ? err.message : String(err),
    });
  });
}

/**
 * Whether an outcome is worth recording for an op of this class.
 *
 * Denials and infrastructure errors always are — they are the security and
 * availability signals. Allowed *writes* are, too:
 * reconstructing what changed a ledger is the question an incident actually
 * asks. Allowed reads are not: they are the overwhelming majority of traffic,
 * and recording them would bury the events someone needs to find.
 */
export function shouldAudit(outcome: AuditOutcome, opClass: string): boolean {
  if (outcome !== "allowed") return true;
  return opClass === "write" || opClass === "admin";
}
