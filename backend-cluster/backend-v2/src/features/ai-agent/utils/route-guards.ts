import type { RouterContext } from "@koa/router";
import type { IModels } from "@/foundation/models/types";
import type { DbExecutor } from "@/drizzle/drizzle";
import { UnauthenticatedError } from "@/shared/errors";
import {
  assertIdentityCapability,
  type OperationClass,
} from "@/server/api/identity";
import { identityFromState } from "@/server/rest/identity-middleware";

export interface ResolveAuthUserDeps {
  models: Pick<IModels, "user">;
  db: DbExecutor;
}

type UserModel = NonNullable<Awaited<ReturnType<IModels["user"]["getById"]>>>;

export async function resolveAuthUser(
  ctx: RouterContext,
  deps: ResolveAuthUserDeps,
  operation?: OperationClass,
): Promise<{
  user: UserModel;
  identity: NonNullable<ReturnType<typeof identityFromState>>;
}> {
  const identity = identityFromState(ctx);
  if (!identity) throw new UnauthenticatedError("Authentication required");
  if (operation) assertIdentityCapability(identity, operation);

  const user = await deps.models.user.getById(deps.db, identity.userId);
  if (!user) throw new UnauthenticatedError("User not found");

  return { user, identity };
}
