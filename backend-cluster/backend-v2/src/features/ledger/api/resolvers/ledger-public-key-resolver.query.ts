import { Arg, Args, Ctx, Query, Resolver } from "type-graphql";
import { Authenticated } from "@/server/graphql/authenticated";
import { IContext } from "@/server/graphql/context";
import type { ILedgerPublicKeyService } from "@/features/ledger/service/ledger-public-key-service";
import {
  PublicKey,
  ListPublicKeysArgs,
} from "./ledger-public-key-resolver.types";

@Resolver(() => PublicKey)
export class LedgerPublicKeyQueryResolver {
  constructor(private readonly publicKeyService: ILedgerPublicKeyService) {}

  @Authenticated()
  @Query(() => [PublicKey], {
    description: "List all public keys for the current user",
  })
  async listPublicKeys(
    @Args() args: ListPublicKeysArgs,
    @Ctx() ctx: IContext,
  ): Promise<PublicKey[]> {
    return this.publicKeyService.listPublicKeys(ctx.getCurrentIdentity(), {
      page: args.page,
      limit: args.limit,
    });
  }

  @Authenticated()
  @Query(() => PublicKey, {
    description: "Get a specific public key by ID",
    nullable: true,
  })
  async getPublicKey(
    @Arg("keyId", () => Number) keyId: number,
    @Ctx() ctx: IContext,
  ): Promise<PublicKey | null> {
    return this.publicKeyService.getPublicKey(ctx.getCurrentIdentity(), keyId);
  }
}
