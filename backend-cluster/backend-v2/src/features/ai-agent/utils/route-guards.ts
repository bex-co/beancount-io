import type { RouterContext } from "@koa/router";
import type { AppConfig } from "@/config/config";
import type { IModels } from "@/foundation/models/types";
import type { DbExecutor } from "@/drizzle/drizzle";
import { credentialRejection } from "@/server/api/identity";
import { UnauthenticatedError } from "@/shared/errors";
import { identityFromState } from "@/server/rest/identity-middleware";

export interface ResolveAuthUserDeps {
  models: Pick<IModels, "user">;
  db: DbExecutor;
  config: AppConfig;
}

type UserModel = NonNullable<Awaited<ReturnType<IModels["user"]["getById"]>>>;

export async function resolveAuthUser(
  ctx: RouterContext,
  deps: ResolveAuthUserDeps,
): Promise<{
  user: UserModel;
  identity: NonNullable<ReturnType<typeof identityFromState>>;
}> {
  const identity = identityFromState(ctx);
  if (!identity) {
    // A credential sent and refused is told so, as REST's `requireIdentity`
    // and GraphQL do (w23/070); asked for a credential, an agent resends the
    // one it just sent (w31/026). The text depends on the headers alone.
    throw new UnauthenticatedError(
      (await credentialRejection(ctx, deps.config)) ??
        "Authentication required",
    );
  }

  const user = await deps.models.user.getById(deps.db, identity.userId);
  if (!user) throw new UnauthenticatedError("User not found");

  return { user, identity };
}
