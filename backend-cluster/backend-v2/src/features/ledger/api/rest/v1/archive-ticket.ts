import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { CacheHelper } from "@/shared/cache";
import { CACHE_KEYS } from "@/shared/cache";
import { ForbiddenError } from "@/shared/errors";

/**
 * Single-use, short-lived download tickets (ADR 0006 security repair 1).
 *
 * The endpoint they replace took `?token=<JWT>`: the caller's long-lived
 * session credential, in a URL, and therefore in the access log, the Referer
 * header, the browser history, and every CDN log in between. Anyone who read
 * one of those places got the caller's whole session, not one download.
 *
 * A ticket is worth exactly one download of one archive of one ledger by one
 * user, for sixty seconds. It goes in the URL because a browser download cannot
 * carry a header — but what leaks into the log is spent by the time anyone
 * reads it, and buys nothing else even before that.
 *
 * Two independent things must hold to redeem one: the signature must verify
 * (so nobody can mint one), and the nonce must still be unclaimed in Redis (so
 * nobody can spend one twice).
 */

const TICKET_TTL_MS = 60_000;
const TICKET_VERSION = "v1";

/**
 * Domain separation: the ticket key is derived from the server secret rather
 * than being it, so a ticket signature can never be confused with — or
 * substituted for — any other signature made with the same secret.
 */
const HMAC_INFO = "beancount-io/v1-archive-ticket";

export interface ArchiveTicketClaims {
  /** User the ticket was minted for. */
  readonly userId: string;
  /** `owner/name` of the ledger. */
  readonly ledgerId: string;
  /** Archive filename, e.g. `gitea-main.zip`. */
  readonly archive: string;
}

interface TicketPayload extends ArchiveTicketClaims {
  /** Expiry, epoch ms. */
  readonly exp: number;
  /** Single-use nonce. */
  readonly nonce: string;
}

function ticketKey(secret: string): Buffer {
  return createHmac("sha256", secret).update(HMAC_INFO).digest();
}

function sign(secret: string, body: string): string {
  return createHmac("sha256", ticketKey(secret))
    .update(body)
    .digest("base64url");
}

const encode = (payload: TicketPayload): string =>
  Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");

function decode(body: string): TicketPayload | undefined {
  try {
    const parsed = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as Partial<TicketPayload>;
    if (
      typeof parsed.userId !== "string" ||
      typeof parsed.ledgerId !== "string" ||
      typeof parsed.archive !== "string" ||
      typeof parsed.exp !== "number" ||
      typeof parsed.nonce !== "string"
    ) {
      return undefined;
    }
    return parsed as TicketPayload;
  } catch {
    return undefined;
  }
}

/** Constant-time compare that tolerates length mismatch without throwing. */
function signaturesMatch(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export interface MintedTicket {
  readonly ticket: string;
  readonly expiresAt: string;
}

/**
 * Mint a ticket and record its nonce as unclaimed.
 *
 * The nonce is written before the ticket is handed out, so a ticket can never
 * be redeemable before the store knows about it.
 */
export async function mintArchiveTicket(
  claims: ArchiveTicketClaims,
  secret: string,
  cache: CacheHelper,
  now: number = Date.now(),
): Promise<MintedTicket> {
  const payload: TicketPayload = {
    ...claims,
    exp: now + TICKET_TTL_MS,
    nonce: randomBytes(16).toString("base64url"),
  };
  const body = encode(payload);
  await cache.setStrict(
    CACHE_KEYS.ledger.archiveTicketNonce(payload.nonce),
    true,
    TICKET_TTL_MS,
  );
  return {
    ticket: `${TICKET_VERSION}.${body}.${sign(secret, body)}`,
    expiresAt: new Date(payload.exp).toISOString(),
  };
}

/**
 * Verify and spend a ticket, returning the user it was minted for.
 *
 * The user comes out of the ticket rather than out of the request: this route
 * is deliberately outside the identity gate, because a browser following a
 * download link cannot attach a bearer token. The ticket says who asked, and
 * the signature is what makes that claim trustworthy.
 *
 * Every refusal is the same `ForbiddenError` on purpose — a caller fishing for
 * the difference between "expired", "already used", and "forged" learns
 * nothing from the response.
 */
export async function redeemArchiveTicket(
  ticket: string,
  expected: Pick<ArchiveTicketClaims, "ledgerId" | "archive">,
  secret: string,
  cache: CacheHelper,
  now: number = Date.now(),
): Promise<{ userId: string }> {
  const refuse = (): never => {
    throw new ForbiddenError(
      "Download ticket is invalid, expired, or already used",
    );
  };

  const [version, body, signature] = ticket.split(".");
  if (version !== TICKET_VERSION || !body || !signature) refuse();
  if (!signaturesMatch(signature, sign(secret, body))) refuse();

  const payload = decode(body);
  if (!payload) return refuse();
  if (payload.exp <= now) refuse();
  if (
    payload.ledgerId !== expected.ledgerId ||
    payload.archive !== expected.archive
  ) {
    // A valid signature over different claims: the ticket is real, but it is
    // not for this URL. Refusing here is what stops one ledger's ticket from
    // downloading another's.
    refuse();
  }

  const key = CACHE_KEYS.ledger.archiveTicketNonce(payload.nonce);
  const unclaimed = await cache.getStrict<boolean>(key);
  if (!unclaimed) refuse();
  // Claimed before a byte is served: a download that fails midway does not hand
  // the ticket back, which is the safe direction to be wrong in.
  await cache.delStrict(key);

  return { userId: payload.userId };
}

/** Ticket lifetime, exported so tests and docs cite one number. */
export const TICKET_LIFETIME_MS = TICKET_TTL_MS;
