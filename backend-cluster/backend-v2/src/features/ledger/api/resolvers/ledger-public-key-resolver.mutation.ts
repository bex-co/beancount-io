import { Arg, Args, Authorized, Ctx, Mutation, Resolver } from "type-graphql";
import { IContext } from "@/server/graphql/context";
import type { ILedgerPublicKeyService } from "@/features/ledger/service/ledger-public-key-service";
import {
  PublicKey,
  CreatePublicKeyInput,
  DeletePublicKeyResponse,
} from "./ledger-public-key-resolver.types";

@Resolver(() => PublicKey)
export class LedgerPublicKeyMutationResolver {
  constructor(private readonly publicKeyService: ILedgerPublicKeyService) {}

  @Authorized()
  @Mutation(() => PublicKey, {
    description: "Create a new public key for the current user",
  })
  async createPublicKey(
    @Args() input: CreatePublicKeyInput,
    @Ctx() ctx: IContext,
  ): Promise<PublicKey> {
    return this.publicKeyService.createPublicKey(ctx.getCurrentUserId(), {
      key: input.key,
      title: input.title,
      readOnly: input.readOnly,
    });
  }

  @Authorized()
  @Mutation(() => DeletePublicKeyResponse, {
    description: "Delete a specific public key by ID",
  })
  async deletePublicKey(
    @Arg("keyId", () => Number) keyId: number,
    @Ctx() ctx: IContext,
  ): Promise<DeletePublicKeyResponse> {
    return this.publicKeyService.deletePublicKey(ctx.getCurrentUserId(), keyId);
  }
}
