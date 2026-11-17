import { Args, ArgsType, Ctx, Field, Mutation, Query } from "type-graphql";
import { IContext } from "@/server/graphql/context";
import { Authenticated } from "@/server/graphql/authenticated";
import type { IOidcLoginService } from "@/features/auth/service/oidc-login-service";

@ArgsType()
class CreateOidcLinkUrlInput {
  @Field(() => String, {
    nullable: true,
    description: "Local dashboard path to return to after linking.",
  })
  public next?: string | null;
}

/** Settings: link or unlink the configured OIDC provider. */
export class OidcLoginResolver {
  constructor(private readonly oidcLogin: IOidcLoginService) {}

  @Authenticated()
  @Query(() => Boolean, {
    description:
      "Whether the signed-in account can sign in through the configured OIDC provider.",
  })
  public async oidcLinked(@Ctx() ctx: IContext): Promise<boolean> {
    return this.oidcLogin.isLinked(ctx.getCurrentIdentity().userId);
  }

  @Authenticated()
  @Mutation(() => String, {
    description:
      "A short-lived URL that links the configured OIDC provider to the signed-in account. Open it in the browser.",
  })
  public async createOidcLinkUrl(
    @Ctx() ctx: IContext,
    @Args() args: CreateOidcLinkUrlInput,
  ): Promise<string> {
    return this.oidcLogin.createLinkUrl(
      ctx.getCurrentIdentity().userId,
      args.next ?? undefined,
    );
  }

  @Authenticated()
  @Mutation(() => Boolean, {
    description:
      "Stop signing in to this account through the configured OIDC provider. Needs a password on the account.",
  })
  public async unlinkOidc(@Ctx() ctx: IContext): Promise<boolean> {
    await this.oidcLogin.unlink(ctx.getCurrentIdentity().userId);
    return true;
  }
}
