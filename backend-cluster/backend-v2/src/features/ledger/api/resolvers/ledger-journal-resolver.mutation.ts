import {
  Arg,
  Ctx,
  Field,
  ObjectType,
  InputType,
  Mutation,
  Resolver,
} from "type-graphql";
import { Authenticated } from "@/server/graphql/authenticated";
import { IContext } from "@/server/graphql/context";
import type { ILedgerJournalService } from "@/features/ledger/service/ledger-journal-service";

@InputType()
class DeleteSourceSliceInput {
  @Field(() => String)
  entryHash: string;

  @Field(() => String)
  sha256sum: string;
}

@ObjectType()
class DeleteSourceSliceResponse {
  @Field(() => String)
  message: string;

  @Field(() => String)
  entryHash: string;
}

@InputType()
class DeleteMultiSourceSliceItemInput {
  @Field(() => String)
  entryHash: string;

  @Field(() => String)
  sha256sum: string;
}

@InputType()
class DeleteMultiSourceSlicesInput {
  @Field(() => [DeleteMultiSourceSliceItemInput])
  entries: DeleteMultiSourceSliceItemInput[];
}

@ObjectType()
class DeleteMultiSourceSlicesResponse {
  @Field(() => String)
  message: string;

  @Field(() => [String])
  deletedHashes: string[];
}

@InputType()
class UpdateSourceSliceInput {
  @Field(() => String)
  entryHash: string;

  @Field(() => String)
  sha256sum: string;

  @Field(() => String)
  newContent: string;
}

@ObjectType()
class UpdateSourceSliceResponse {
  @Field(() => String)
  message: string;

  @Field(() => String)
  entryHash: string;

  @Field(() => String)
  newSha256sum: string;
}

@Resolver()
export class LedgerJournalMutationResolver {
  constructor(private readonly journalService: ILedgerJournalService) {}

  @Authenticated()
  @Mutation(() => DeleteSourceSliceResponse, {
    description: "Delete a source slice for a specific journal entry",
  })
  async deleteLedgerEntrySourceSlice(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Arg("input", () => DeleteSourceSliceInput) input: DeleteSourceSliceInput,
    @Ctx() ctx: IContext,
  ): Promise<DeleteSourceSliceResponse> {
    return this.journalService.deleteSourceSlice({
      ledgerId,
      identity: ctx.getCurrentIdentity(),
      entryHash: input.entryHash,
      sha256sum: input.sha256sum,
    });
  }

  @Authenticated()
  @Mutation(() => DeleteMultiSourceSlicesResponse, {
    description:
      "Delete multiple source slices for journal entries in a single operation",
  })
  async deleteMultipleLedgerEntrySourceSlices(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Arg("input", () => DeleteMultiSourceSlicesInput)
    input: DeleteMultiSourceSlicesInput,
    @Ctx() ctx: IContext,
  ): Promise<DeleteMultiSourceSlicesResponse> {
    return this.journalService.deleteMultiSourceSlices({
      ledgerId,
      identity: ctx.getCurrentIdentity(),
      entries: input.entries.map((e) => ({
        entryHash: e.entryHash,
        sha256sum: e.sha256sum,
      })),
    });
  }

  @Authenticated()
  @Mutation(() => UpdateSourceSliceResponse, {
    description: "Update a source slice for a specific journal entry",
  })
  async updateLedgerEntrySourceSlice(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Arg("input", () => UpdateSourceSliceInput) input: UpdateSourceSliceInput,
    @Ctx() ctx: IContext,
  ): Promise<UpdateSourceSliceResponse> {
    return this.journalService.updateSourceSlice({
      ledgerId,
      identity: ctx.getCurrentIdentity(),
      entryHash: input.entryHash,
      sha256sum: input.sha256sum,
      newContent: input.newContent,
    });
  }
}
