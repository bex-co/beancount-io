import type { RouterContext } from "@koa/router";
import { getTokenFromCtx } from "@/features/auth/utils/auth";
import type { IModels } from "@/foundation/models/types";
import type { DbExecutor } from "@/drizzle/drizzle";
import { UnauthenticatedError } from "@/shared/errors";

export interface ResolveAuthUserDeps {
  models: Pick<IModels, "jwt" | "user">;
  db: DbExecutor;
}

type UserModel = NonNullable<Awaited<ReturnType<IModels["user"]["getById"]>>>;

export async function resolveAuthUser(
  ctx: RouterContext,
  deps: ResolveAuthUserDeps,
): Promise<{ user: UserModel }> {
  const token = getTokenFromCtx(ctx);
  if (!token)
    throw new UnauthenticatedError("Unauthorized - no token provided");

  const userId = await deps.models.jwt.verify(deps.db, token);
  if (!userId) throw new UnauthenticatedError("Invalid or expired token");

  const user = await deps.models.user.getById(deps.db, userId);
  if (!user) throw new UnauthenticatedError("User not found");

  return { user };
}
