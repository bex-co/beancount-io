import {
  Arg,
  Ctx,
  Field,
  Int,
  ObjectType,
  InputType,
  Mutation,
  Resolver,
} from "type-graphql";
import { Authenticated } from "@/server/graphql/authenticated";
import { IContext } from "@/server/graphql/context";
import type { ILedgerJournalService } from "@/features/ledger/service/ledger-journal-service";
import { resolveEntryHash } from "@/features/ledger/utils/entry-hash-alias";
import { PREVIEW_FLAG_DESCRIPTION } from "@/features/ledger/utils/preview-flag-description";
import {
  ALLOW_INVALID_NAMES,
  DRY_RUN_NAMES,
  resolveFlagAlias,
} from "@/features/ledger/utils/flag-alias";

@InputType()
class DeleteSourceSliceInput {
  @Field(() => String, { nullable: true })
  entryHash?: string;

  @Field(() => String, {
    nullable: true,
    description: "Alias of entryHash, as list output spells it.",
  })
  entry_hash?: string;

  @Field(() => String)
  sha256sum: string;

  @Field(() => Boolean, {
    nullable: true,
    description:
      "Delete the entry even when that would add bean-check errors (VALIDATION_FAILED), instead of refusing",
  })
  allowInvalid?: boolean;

  // Twin (w23/m9/t003): no surface spells it `allow_invalid` yet.
  @Field(() => Boolean, {
    nullable: true,
    description: "Alias of allowInvalid.",
  })
  allow_invalid?: boolean;

  @Field(() => Boolean, {
    nullable: true,
    description: PREVIEW_FLAG_DESCRIPTION,
  })
  dryRun?: boolean;

  @Field(() => Boolean, {
    nullable: true,
    description: "Alias of dryRun, as MCP spells it.",
  })
  dry_run?: boolean;
}

@ObjectType()
class SlicePreviewFile {
  @Field(() => String)
  path: string;

  @Field(() => String)
  text: string;
}

@ObjectType()
class DeleteSourceSliceResponse {
  @Field(() => String)
  message: string;

  @Field(() => Boolean)
  dryRun: boolean;

  @Field(() => String)
  entryHash: string;

  @Field(() => [SlicePreviewFile], {
    description: "Per-file affected text; populated on dry runs only",
  })
  preview: SlicePreviewFile[];
}

@InputType()
class DeleteMultiSourceSliceItemInput {
  @Field(() => String, { nullable: true })
  entryHash?: string;

  @Field(() => String, {
    nullable: true,
    description: "Alias of entryHash, as list output spells it.",
  })
  entry_hash?: string;

  @Field(() => String)
  sha256sum: string;
}

@InputType()
class DeleteMultiSourceSlicesInput {
  @Field(() => [DeleteMultiSourceSliceItemInput])
  entries: DeleteMultiSourceSliceItemInput[];

  @Field(() => Boolean, {
    nullable: true,
    description:
      "Delete the entries even when that would add bean-check errors (VALIDATION_FAILED), instead of refusing",
  })
  allowInvalid?: boolean;

  // Twin (w23/m9/t003): no surface spells it `allow_invalid` yet.
  @Field(() => Boolean, {
    nullable: true,
    description: "Alias of allowInvalid.",
  })
  allow_invalid?: boolean;

  @Field(() => Boolean, {
    nullable: true,
    description: PREVIEW_FLAG_DESCRIPTION,
  })
  dryRun?: boolean;

  @Field(() => Boolean, {
    nullable: true,
    description: "Alias of dryRun, as MCP spells it.",
  })
  dry_run?: boolean;
}

@ObjectType()
class DeleteMultiSourceSlicesResponse {
  @Field(() => String)
  message: string;

  @Field(() => Boolean)
  dryRun: boolean;

  @Field(() => Int)
  deletedCount: number;

  @Field(() => [SlicePreviewFile], {
    description: "Per-file affected text; populated on dry runs only",
  })
  preview: SlicePreviewFile[];
}

@InputType()
class UpdateSourceSliceInput {
  @Field(() => String, { nullable: true })
  entryHash?: string;

  @Field(() => String, {
    nullable: true,
    description: "Alias of entryHash, as list output spells it.",
  })
  entry_hash?: string;

  @Field(() => String)
  sha256sum: string;

  @Field(() => String)
  newContent: string;

  @Field(() => Boolean, {
    nullable: true,
    description:
      "Commit the edit even when it would add bean-check errors (VALIDATION_FAILED), instead of refusing",
  })
  allowInvalid?: boolean;

  // Twin (w23/m9/t003): no surface spells it `allow_invalid` yet.
  @Field(() => Boolean, {
    nullable: true,
    description: "Alias of allowInvalid.",
  })
  allow_invalid?: boolean;

  @Field(() => Boolean, {
    nullable: true,
    description: PREVIEW_FLAG_DESCRIPTION,
  })
  dryRun?: boolean;

  @Field(() => Boolean, {
    nullable: true,
    description: "Alias of dryRun, as MCP spells it.",
  })
  dry_run?: boolean;
}

@ObjectType()
class UpdateSourceSliceResponse {
  @Field(() => String)
  message: string;

  @Field(() => Boolean)
  dryRun: boolean;

  @Field(() => String)
  entryHash: string;

  @Field(() => String)
  newSha256sum: string;

  @Field(() => String, {
    description:
      "The entry's public ID after the commit — use it for the next edit, not entryHash.",
  })
  newEntryHash: string;

  @Field(() => [SlicePreviewFile], {
    description: "Per-file affected text; populated on dry runs only",
  })
  preview: SlicePreviewFile[];
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
    const result = await this.journalService.deleteSourceSlice({
      ledgerId,
      identity: ctx.getCurrentIdentity(),
      entryHash: resolveEntryHash(input),
      sha256sum: input.sha256sum,
      allowInvalid: resolveFlagAlias(
        { primary: input.allow_invalid, legacy: input.allowInvalid },
        ALLOW_INVALID_NAMES,
      ),
      dryRun: resolveFlagAlias(
        { primary: input.dry_run, legacy: input.dryRun },
        DRY_RUN_NAMES,
      ),
    });
    return { ...result, preview: result.preview ?? [] };
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
    const result = await this.journalService.deleteMultiSourceSlices({
      ledgerId,
      identity: ctx.getCurrentIdentity(),
      entries: input.entries.map((e) => ({
        entryHash: resolveEntryHash(e),
        sha256sum: e.sha256sum,
      })),
      allowInvalid: resolveFlagAlias(
        { primary: input.allow_invalid, legacy: input.allowInvalid },
        ALLOW_INVALID_NAMES,
      ),
      dryRun: resolveFlagAlias(
        { primary: input.dry_run, legacy: input.dryRun },
        DRY_RUN_NAMES,
      ),
    });
    return { ...result, preview: result.preview ?? [] };
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
    const result = await this.journalService.updateSourceSlice({
      ledgerId,
      identity: ctx.getCurrentIdentity(),
      entryHash: resolveEntryHash(input),
      sha256sum: input.sha256sum,
      newContent: input.newContent,
      platform: ctx.platform,
      allowInvalid: resolveFlagAlias(
        { primary: input.allow_invalid, legacy: input.allowInvalid },
        ALLOW_INVALID_NAMES,
      ),
      dryRun: resolveFlagAlias(
        { primary: input.dry_run, legacy: input.dryRun },
        DRY_RUN_NAMES,
      ),
    });
    return { ...result, preview: result.preview ?? [] };
  }
}
