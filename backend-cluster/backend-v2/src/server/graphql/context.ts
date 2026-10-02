import { requestPlatform } from "@/server/api/request-platform";
import { AppConfig } from "@/config/config";
import { type DatabaseLayer } from "@/foundation/composition";
import { UnauthenticatedError } from "@/shared/errors";
import { User } from "@/features/auth/data/user-model";
import { getTokenFromCtx } from "@/features/auth/utils/auth";
import { type Identity, resolveIdentity } from "@/server/api/identity";
import { GraphQLLoaders, createLoaders } from "./loaders";
import { logger } from "@/shared/logger";

const lastSeenThrottle = new Map<string, number>();
const LAST_SEEN_THROTTLE_MS = 5 * 60 * 1000;

export interface IContext {
  /**
   * The resolved caller, from the one authentication gate shared with REST and
   * MCP (`server/api/identity.ts`). Undefined for an unauthenticated request.
   */
  identity?: Identity;
  /** Alias of `identity?.userId`, kept so resolvers read the caller unchanged. */
  userId?: string;
  token?: string;
  reqHeaders: Record<string, string>;
  platform: "web" | "mobile";
  config: AppConfig;
  koaCtx: ContextLike;
  loaders: GraphQLLoaders;
  getCurrentUserId: () => string;
  getCurrentUser: () => Promise<User>;
  /** `getCurrentUserId`'s sibling for verbs that need the full Identity — the
   * write-class ledger verbs, which `authorizeLedger` requires one for. */
  getCurrentIdentity: () => Identity;
}

/**
 * Minimal context interface that provides the properties needed for context creation
 */
interface ContextLike {
  headers: Record<string, string | string[] | undefined>;
}

/**
 * Creates a GraphQL context from a Koa context-like object
 * @param ctx - Koa context-like object with headers
 * @param database - Database layer (models + db handle)
 * @param config - Application configuration
 * @returns Promise resolving to IContext
 */
export async function createContext(
  ctx: ContextLike,
  database: DatabaseLayer,
  config: AppConfig,
): Promise<IContext> {
  // One gate for every surface: a session JWT and an OAuth access token both
  // resolve here, which is what lets a single credential reach GraphQL, REST,
  // and MCP alike (ADR 0006 D2).
  const identity = await resolveIdentity(ctx, database, config);
  const userId = identity?.userId;
  if (userId) {
    await touchLastSeen(userId, database);
  }

  // Convert headers to the expected format (Record<string, string>)
  const reqHeaders: Record<string, string> = {};
  for (const [key, value] of Object.entries(ctx.headers)) {
    if (value !== undefined) {
      reqHeaders[key] = Array.isArray(value) ? value[0] : value;
    }
  }

  const getCurrentUserId = (): string => {
    if (!userId) {
      throw new UnauthenticatedError("Authentication required");
    }
    return userId;
  };

  const getCurrentIdentity = (): Identity => {
    if (!identity) {
      throw new UnauthenticatedError("Authentication required");
    }
    return identity;
  };
  const getCurrentUser = async () => {
    const user = await database.models.user.getById(
      database.db,
      getCurrentUserId(),
    );
    if (!user) {
      throw new UnauthenticatedError("User not found");
    }
    return user as User;
  };

  const platform = requestPlatform(ctx.headers);

  // Create DataLoaders for this request
  const loaders = createLoaders(database.db, database.models);

  return {
    identity,
    userId,
    // The raw credential as presented (bearer OR cookie). `logout` revokes by
    // exact token and browser sessions arrive by cookie, so this must keep the
    // cookie fallback even though authentication no longer goes through it.
    token: getTokenFromCtx(ctx as Parameters<typeof getTokenFromCtx>[0]),
    reqHeaders,
    platform,
    config,
    koaCtx: ctx,
    loaders,
    getCurrentUserId,
    getCurrentUser,
    getCurrentIdentity,
  };
}

/**
 * Stamp `lastSeenAt`, at most once per user per throttle window. Fires for any
 * resolved identity, not just sessions: an API-driven user is no less active
 * than one clicking around the dashboard.
 */
async function touchLastSeen(
  userId: string,
  database: DatabaseLayer,
): Promise<void> {
  const last = lastSeenThrottle.get(userId) ?? 0;
  if (Date.now() - last <= LAST_SEEN_THROTTLE_MS) {
    return;
  }
  lastSeenThrottle.set(userId, Date.now());
  try {
    await database.models.user.updateLastSeenAt(
      database.db,
      userId,
      new Date(),
    );
  } catch (err) {
    logger.error("Failed to update lastSeenAt", { error: err });
  }
}
