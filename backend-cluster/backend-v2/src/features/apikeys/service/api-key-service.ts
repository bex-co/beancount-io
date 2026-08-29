import { createHash, timingSafeEqual } from "node:crypto";
import type { DbExecutor } from "@/drizzle/drizzle";
import type { IModels } from "@/foundation/models";
import type { ApiKey } from "../data/api-key-model";
import {
  API_SCOPES,
  assertIdentityCapability,
  identityHasCapability,
  type ApiScope,
  type Identity,
  type OperationClass,
} from "@/server/api/identity";
import {
  ForbiddenError,
  NotFoundError,
  PremiumRequiredError,
  ValidationError,
} from "@/shared/errors";
import { prefixedNanoidBase58 } from "@/shared/nanoid-base58";
import { logger } from "@/shared/logger";
import { parseLedgerId } from "@/shared/str";

const keyLogger = logger.child({ module: "api-key-service" });

/** Plaintext key format: `bcio_<base58>` (ADR 0006 D6). */
const KEY_PREFIX = "bcio_";
const KEY_ENTROPY_CHARS = 32;
/** How much of the plaintext is safe to keep for display. */
const DISPLAY_PREFIX_LENGTH = KEY_PREFIX.length + 8;

const OPERATION_FOR_SCOPE: Record<ApiScope, OperationClass> = {
  "ledger.read": "read",
  "ledger.write": "write",
  "ledger.admin": "admin",
};

/** What a mint returns. The plaintext exists in this object and nowhere else, ever again. */
export interface MintedApiKey {
  key: ApiKey;
  /** Shown exactly once. Not stored, not recoverable, not logged. */
  plaintext: string;
}

export interface MintApiKeyInput {
  name: string;
  scopes: string[];
  ledgerScope?: string;
  expiresAt?: Date;
}

export interface IApiKeyService {
  mint(identity: Identity, input: MintApiKeyInput): Promise<MintedApiKey>;
  list(identity: Identity): Promise<ApiKey[]>;
  revoke(identity: Identity, id: string): Promise<ApiKey>;
  /** The authentication path's lookup. Returns null for anything not currently usable. */
  verify(plaintext: string, now?: Date): Promise<ApiKey | null>;
  /** Fire-and-forget usage stamp; see `stampLastUsed` for why it is throttled. */
  stampLastUsed(keyId: string, now?: Date): Promise<void>;
}

export interface ApiKeyServiceDeps {
  db: DbExecutor;
  models: Pick<IModels, "apiKey">;
  /** Whether this user's plan may mint keys. Injected so the service does not reach into billing. */
  isPremium: (userId: string) => Promise<boolean>;
}

/** Plaintext key prefix, exported for the auth path's cheap pre-check. */
export const API_KEY_PLAINTEXT_PREFIX = KEY_PREFIX;

/** sha256 of the plaintext, hex. */
export const apiKeyDigest = (plaintext: string): string =>
  createHash("sha256").update(plaintext, "utf8").digest("hex");

/**
 * Constant-time digest comparison.
 *
 * The lookup is by digest, so a timing difference here leaks nothing about the
 * key itself — but comparing two hex strings with `===` in an auth path is the
 * habit that eventually gets applied to something where it does matter.
 */
export function apiKeyDigestsMatch(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/** Whether a string is a ledger id of the `owner/name` shape. */
function isLedgerId(value: string): boolean {
  try {
    parseLedgerId(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * The requested ledger confinement, or `undefined` for "inherit the minter's".
 *
 * Blank input means "not asked for" and never becomes a stored `""`: an empty
 * pin is falsy, which `assertLedgerScope` reads as *unconfined* — the exact
 * opposite of what a pin is for. Anything non-blank has to be a real ledger id.
 */
export function normalizeLedgerScope(
  value: string | undefined,
): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (!isLedgerId(trimmed)) {
    throw new ValidationError(
      "ledgerScope",
      "A ledger scope names one ledger as `owner/name`",
    );
  }
  return trimmed;
}

/**
 * A stored pin is either absent or a well-formed ledger id. `mint` never
 * writes anything else, so a row carrying, say, `""` is refused outright
 * rather than read as unconfined (see `normalizeLedgerScope`).
 */
const hasWellFormedLedgerScope = (key: ApiKey): boolean =>
  key.ledgerScope === undefined || isLedgerId(key.ledgerScope);

/**
 * Whether a key is usable right now. Exported because the authentication path
 * asks the same question, and two implementations of "is this credential still
 * good" is how a revoked key keeps working on one surface.
 */
export const isApiKeyLive = (key: ApiKey, now: Date): boolean =>
  !key.revokedAt &&
  (!key.expiresAt || key.expiresAt > now) &&
  hasWellFormedLedgerScope(key);

/**
 * API keys: durable, scoped credentials for clients that cannot do a browser
 * ceremony — CI, cron, a CLI, an agent (ADR 0006 D6).
 *
 * Four rules are enforced here rather than in the adapters, so they hold on
 * whichever surface is asking:
 *
 * 1. **Key management requires `ledger.admin`.** Listing, minting, and
 *    revocation are control-plane operations, not ledger content access.
 * 2. **A key may not mint a key.** A credential that can create its own
 *    successor cannot really be revoked: revoke it, and the key it minted
 *    yesterday still works. Minting requires a session or a full OAuth grant,
 *    checked on `Identity.method`.
 * 3. **Minting is a paid feature.** Confirmed as a pricing decision for w1/m22
 *    (okr.md 杠杆 1). Existing keys keep working if a subscription lapses —
 *    breaking a running integration is a support incident, not a nudge.
 * 4. **Scopes come from the closed vocabulary,** and a key can only ever narrow
 *    what its minter had, never widen it.
 * 5. **A ledger pin is a ceiling too.** A credential confined to one ledger at
 *    consent time mints keys confined to that same ledger — it may restate the
 *    pin or inherit it, never name a different ledger or drop it.
 */
export class ApiKeyService implements IApiKeyService {
  constructor(private readonly deps: ApiKeyServiceDeps) {}

  async mint(
    identity: Identity,
    input: MintApiKeyInput,
  ): Promise<MintedApiKey> {
    assertIdentityCapability(identity, "admin");

    if (identity.method === "apikey") {
      throw new ForbiddenError(
        "An API key cannot mint another API key. Sign in, or use an OAuth grant, to create one.",
      );
    }

    if (!(await this.deps.isPremium(identity.userId))) {
      throw new PremiumRequiredError(
        "API keys",
        "Minting API keys is a paid feature. Existing keys keep working.",
      );
    }

    const name = input.name.trim();
    if (!name) {
      throw new ValidationError(
        "name",
        "A key needs a name you will recognize",
      );
    }

    const scopes = normalizeScopes(input.scopes);
    if (!identity.capabilityExempt) {
      // An OAuth grant minting a key may not hand out more than it holds:
      // otherwise `ledger.read` becomes `ledger.admin` in two steps.
      const widened = scopes.filter(
        (scope) =>
          !identityHasCapability(identity, OPERATION_FOR_SCOPE[scope]),
      );
      if (widened.length > 0) {
        throw new ForbiddenError(
          `A key cannot be granted scopes its creator does not hold: ${widened.join(", ")}`,
        );
      }
    }

    const requestedLedgerScope = normalizeLedgerScope(input.ledgerScope);
    if (
      identity.ledgerScope &&
      requestedLedgerScope !== undefined &&
      requestedLedgerScope !== identity.ledgerScope
    ) {
      // Same shape as the scope check above: the pin the user consented to is
      // the most a key minted under it may have. A grant for `alice/main` that
      // could mint a key for `alice/other` would make the consent screen a
      // formality.
      throw new ForbiddenError(
        "A key cannot be confined to a ledger its creator is not authorized for",
      );
    }
    const ledgerScope = requestedLedgerScope ?? identity.ledgerScope;

    if (input.expiresAt && input.expiresAt.getTime() <= Date.now()) {
      throw new ValidationError("expiresAt", "Expiry must be in the future");
    }

    const plaintext = `${KEY_PREFIX}${prefixedNanoidBase58("", KEY_ENTROPY_CHARS)}`;
    const key = await this.deps.models.apiKey.create(this.deps.db, {
      id: prefixedNanoidBase58("akey_"),
      userId: identity.userId,
      name,
      keyDigest: apiKeyDigest(plaintext),
      keyPrefix: plaintext.slice(0, DISPLAY_PREFIX_LENGTH),
      scopes,
      ledgerScope,
      expiresAt: input.expiresAt,
    });

    // The key id, never the key. This line is the reason the plaintext is built
    // and returned in one expression and never assigned anywhere else.
    keyLogger.info("API key minted", {
      keyId: key.id,
      userId: identity.userId,
      scopes,
    });

    return { key, plaintext };
  }

  async list(identity: Identity): Promise<ApiKey[]> {
    assertIdentityCapability(identity, "admin");
    return this.deps.models.apiKey.listByUserId(this.deps.db, identity.userId);
  }

  async revoke(identity: Identity, id: string): Promise<ApiKey> {
    assertIdentityCapability(identity, "admin");
    const existing = await this.deps.models.apiKey.findById(this.deps.db, id);
    // Same error for "not yours" and "not there": otherwise revoke becomes a
    // probe for which key ids exist.
    if (!existing || existing.userId !== identity.userId) {
      throw new NotFoundError("API key", id);
    }
    if (existing.revokedAt) return existing;

    const revoked = await this.deps.models.apiKey.revoke(
      this.deps.db,
      id,
      new Date(),
    );
    if (!revoked) throw new NotFoundError("API key", id);
    keyLogger.info("API key revoked", { keyId: id, userId: identity.userId });
    return revoked;
  }

  async verify(
    plaintext: string,
    now: Date = new Date(),
  ): Promise<ApiKey | null> {
    if (!plaintext.startsWith(KEY_PREFIX)) return null;

    const candidate = apiKeyDigest(plaintext);
    const key = await this.deps.models.apiKey.findByDigest(
      this.deps.db,
      candidate,
    );
    // Revoked, expired, and never-existed all answer the same way. A caller
    // that could tell them apart could enumerate which keys were once real.
    if (
      !key ||
      !apiKeyDigestsMatch(key.keyDigest, candidate) ||
      !isApiKeyLive(key, now)
    ) {
      return null;
    }
    return key;
  }

  async stampLastUsed(keyId: string, now: Date = new Date()): Promise<void> {
    await this.deps.models.apiKey.touchLastUsedAt(this.deps.db, keyId, now);
  }
}

/** Reject anything outside the closed vocabulary, and de-duplicate. */
export function normalizeScopes(scopes: readonly string[]): ApiScope[] {
  const allowed = new Set<string>(API_SCOPES);
  const unknown = scopes.filter((scope) => !allowed.has(scope));
  if (unknown.length > 0) {
    throw new ValidationError(
      "scopes",
      `Unknown scope(s): ${unknown.join(", ")}. Valid scopes are ${API_SCOPES.join(", ")}.`,
    );
  }
  if (scopes.length === 0) {
    throw new ValidationError("scopes", "A key with no scopes can do nothing");
  }
  return [...new Set(scopes)] as ApiScope[];
}

/** What a list response may contain — everything except the secret's shadow. */
export interface PublicApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  ledgerScope?: string;
  lastUsedAt?: Date;
  expiresAt?: Date;
  revokedAt?: Date;
  createdAt: Date;
}

/**
 * Strip a key record down to what is safe to return.
 *
 * `keyDigest` is not a secret in the sense the plaintext is, but it is the
 * value a lookup compares against — publishing it would hand out the one thing
 * an attacker with database read access would otherwise need. It leaves through
 * this function or not at all.
 */
export const toPublicApiKey = (key: ApiKey): PublicApiKey => ({
  id: key.id,
  name: key.name,
  keyPrefix: key.keyPrefix,
  scopes: key.scopes,
  ledgerScope: key.ledgerScope,
  lastUsedAt: key.lastUsedAt,
  expiresAt: key.expiresAt,
  revokedAt: key.revokedAt,
  createdAt: key.createdAt,
});
