import {
  Arg,
  Ctx,
  Field,
  InputType,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from "type-graphql";
import {
  IContext,
  authorizationRequestFromContext,
} from "@/server/graphql/context";
import { API_SCOPES } from "@/server/api/identity";
import { ValidationError } from "@/shared/errors";
import { toPublicApiKey } from "../service/api-key-service";
import type { IApiKeyWorkflow } from "../workflow/api-key-workflow";

/**
 * Key management over GraphQL — where the dashboard will call it from.
 *
 * The mint mutation returns the plaintext in the same response that creates the
 * key and in no other response ever; `ApiKeyType` deliberately has no field
 * that could carry it, so a later query cannot be made to return one by
 * accident.
 */
@ObjectType()
export class ApiKeyType {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String, {
    description: "The key's first characters, for telling keys apart",
  })
  keyPrefix!: string;

  @Field(() => [String])
  scopes!: string[];

  @Field(() => String, { nullable: true })
  ledgerScope?: string;

  @Field(() => Date, { nullable: true })
  lastUsedAt?: Date;

  @Field(() => Date, { nullable: true })
  expiresAt?: Date;

  @Field(() => Date, { nullable: true })
  revokedAt?: Date;

  @Field(() => Date)
  createdAt!: Date;
}

@ObjectType()
export class MintedApiKeyType {
  @Field(() => ApiKeyType)
  key!: ApiKeyType;

  @Field(() => String, {
    description:
      "The key itself. Returned by this mutation and never retrievable again.",
  })
  plaintext!: string;
}

@InputType()
export class CreateApiKeyInputType {
  @Field(() => String)
  name!: string;

  @Field(() => [String], {
    description: `Any of: ${API_SCOPES.join(", ")}`,
  })
  scopes!: string[];

  @Field(() => String, { nullable: true })
  ledgerScope?: string;

  @Field(() => Date, { nullable: true })
  expiresAt?: Date;
}

@Resolver()
export class ApiKeyResolver {
  constructor(private readonly workflow: IApiKeyWorkflow) {}

  @Query(() => [ApiKeyType], { description: "Your API keys" })
  async apiKeys(@Ctx() ctx: IContext): Promise<ApiKeyType[]> {
    const keys = await this.workflow.list(authorizationRequestFromContext(ctx));
    return keys.map(toPublicApiKey) as ApiKeyType[];
  }

  @Mutation(() => MintedApiKeyType, {
    description:
      "Mint an API key. Requires a paid plan; an API key cannot mint another.",
  })
  async createApiKey(
    @Arg("input", () => CreateApiKeyInputType) input: CreateApiKeyInputType,
    @Ctx() ctx: IContext,
  ): Promise<MintedApiKeyType> {
    if (!Array.isArray(input.scopes) || input.scopes.length === 0) {
      throw new ValidationError(
        "scopes",
        "A key with no scopes can do nothing",
      );
    }
    const minted = await this.workflow.mint(
      authorizationRequestFromContext(ctx),
      input,
    );
    return {
      key: toPublicApiKey(minted.key) as ApiKeyType,
      plaintext: minted.plaintext,
    };
  }

  @Mutation(() => ApiKeyType, {
    description: "Revoke an API key, effective on its next use",
  })
  async revokeApiKey(
    @Arg("id", () => String) id: string,
    @Ctx() ctx: IContext,
  ): Promise<ApiKeyType> {
    const revoked = await this.workflow.revoke(
      authorizationRequestFromContext(ctx),
      id,
    );
    return toPublicApiKey(revoked) as ApiKeyType;
  }
}
