import { Arg, Ctx, Field, ObjectType, Query, Resolver } from "type-graphql";
import { IContext } from "@/server/graphql/context";
import { Authenticated } from "@/server/graphql/authenticated";
import type { ITokenIntrospectionService } from "../service/token-introspection-service";

/**
 * Introspection over GraphQL — the same service, the same answer.
 *
 * The REST route is the one RFC 7662 describes and the one an off-the-shelf
 * validator will use. This exists because the dashboard is a GraphQL client and
 * "is this token still live" is a question it can reasonably ask about its own
 * credentials without learning a second transport.
 *
 * Field names keep the RFC's spelling rather than being camel-cased. The point
 * of this object is that it is the same document the REST route returns; a
 * reader comparing the two should not have to translate.
 */
@ObjectType()
export class IntrospectionType {
  @Field(() => Boolean, {
    description:
      "Whether the credential is usable right now. False covers expired, malformed, revoked, never-issued, and belonging to another user — deliberately indistinguishable, and the only field set when false.",
  })
  active!: boolean;

  @Field(() => String, { nullable: true })
  sub?: string;

  @Field(() => String, {
    nullable: true,
    description:
      "Effective capability in the ledger scope vocabulary, space-delimited — not the raw grant. A session token is not scope-constrained and reports all three.",
  })
  scope?: string;

  @Field(() => String, { nullable: true })
  client_id?: string;

  @Field(() => String, { nullable: true })
  jti?: string;

  @Field(() => Number, { nullable: true })
  iat?: number;

  @Field(() => Number, { nullable: true })
  exp?: number;

  @Field(() => String, {
    nullable: true,
    description: "`session`, `oauth`, or `apikey`",
  })
  bio_credential_kind?: string;

  @Field(() => String, {
    nullable: true,
    description: "`interactive`, `delegated`, or `workload`",
  })
  bio_assurance?: string;

  @Field(() => String, {
    nullable: true,
    description: "The one ledger this credential may touch, if it is confined",
  })
  bio_ledger_scope?: string;
}

@Resolver()
export class TokenIntrospectionResolver {
  constructor(
    private readonly tokenIntrospectionService: ITokenIntrospectionService,
  ) {}

  @Authenticated()
  @Query(() => IntrospectionType, {
    description:
      "Check whether a credential is live — an OAuth access token, a `bcio_` API key, or a session token. You may introspect your own credentials; anyone else's reads as inactive, exactly as an invalid one does.",
  })
  async introspectToken(
    @Arg("token", () => String) token: string,
    @Arg("tokenTypeHint", () => String, { nullable: true })
    tokenTypeHint: string | undefined,
    @Ctx() ctx: IContext,
  ): Promise<IntrospectionType> {
    return this.tokenIntrospectionService.introspect(ctx.getCurrentIdentity(), {
      token,
      ...(tokenTypeHint ? { token_type_hint: tokenTypeHint } : {}),
    });
  }
}
