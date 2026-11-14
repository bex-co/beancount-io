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
import { UNCHANGED_EDIT_DESCRIPTION } from "@/features/ledger/utils/entry-field-descriptions";
import { PREVIEW_FLAG_DESCRIPTION } from "@/features/ledger/utils/preview-flag-description";
import {
  ALLOW_INVALID_NAMES,
  DRY_RUN_NAMES,
  resolveFlagAlias,
} from "@/features/ledger/utils/flag-alias";
import { COMMIT_SHA_DESCRIPTION } from "@/features/ledger/utils/commit-revert";
import {
  MOVE_ENTRIES_DESCRIPTION,
  MOVE_INCLUDE_FROM_DESCRIPTION,
  MOVE_TO_PATH_DESCRIPTION,
} from "@/features/ledger/utils/move-entries-description";
import { SliceWriteError } from "./ledger-resolver.types";

@InputType()
class DeleteSourceSliceInput {
  @Field(() => String, {
    nullable: true,
    description: "The entry's hash. One of entryHash/entry_hash is required.",
  })
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

  @Field(() => Number)
  errorsBefore: number;

  @Field(() => Number)
  errorsAfter: number;

  @Field(() => [SliceWriteError])
  newErrors: SliceWriteError[];

  @Field(() => Boolean, {
    description:
      "True only when the write adds no bean-check error; gate a preview on this.",
  })
  valid: boolean;

  @Field(() => String, {
    nullable: true,
    description: COMMIT_SHA_DESCRIPTION,
  })
  commit?: string;
}

@InputType()
class DeleteMultiSourceSliceItemInput {
  @Field(() => String, {
    nullable: true,
    description: "The entry's hash. One of entryHash/entry_hash is required.",
  })
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

  @Field(() => Number)
  errorsBefore: number;

  @Field(() => Number)
  errorsAfter: number;

  @Field(() => [SliceWriteError])
  newErrors: SliceWriteError[];

  @Field(() => Boolean, {
    description:
      "True only when the write adds no bean-check error; gate a preview on this.",
  })
  valid: boolean;

  @Field(() => String, {
    nullable: true,
    description: COMMIT_SHA_DESCRIPTION,
  })
  commit?: string;
}

@InputType()
class MoveEntrySourcesInput {
  @Field(() => [DeleteMultiSourceSliceItemInput])
  entries: DeleteMultiSourceSliceItemInput[];

  @Field(() => String, { description: MOVE_TO_PATH_DESCRIPTION })
  toPath: string;

  @Field(() => String, {
    nullable: true,
    description: MOVE_INCLUDE_FROM_DESCRIPTION,
  })
  includeFrom?: string;

  @Field(() => Boolean, {
    nullable: true,
    description:
      "Move the entries even when that would add bean-check errors (VALIDATION_FAILED), instead of refusing",
  })
  allowInvalid?: boolean;

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
class MoveEntrySourcesResponse {
  @Field(() => String)
  message: string;

  @Field(() => Boolean)
  dryRun: boolean;

  @Field(() => [String], {
    description: "The moved entries' hashes, each once, in ledger order",
  })
  movedHashes: string[];

  @Field(() => String)
  toPath: string;

  @Field(() => Boolean, {
    description:
      "Whether includeFrom gained toPath's include line (on a preview, would gain it)",
  })
  includeAdded: boolean;

  @Field(() => [SlicePreviewFile], {
    description: "Each moved entry's text at the file it leaves",
  })
  preview: SlicePreviewFile[];

  @Field(() => Number)
  errorsBefore: number;

  @Field(() => Number)
  errorsAfter: number;

  @Field(() => [SliceWriteError])
  newErrors: SliceWriteError[];

  @Field(() => Boolean, {
    description:
      "True only when the write adds no bean-check error; gate a preview on this.",
  })
  valid: boolean;

  @Field(() => String, {
    nullable: true,
    description: COMMIT_SHA_DESCRIPTION,
  })
  commit?: string;
}

@InputType()
class UpdateSourceSliceInput {
  @Field(() => String, {
    nullable: true,
    description: "The entry's hash. One of entryHash/entry_hash is required.",
  })
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

  @Field(() => Boolean, { description: UNCHANGED_EDIT_DESCRIPTION })
  unchanged: boolean;

  @Field(() => [SlicePreviewFile], {
    description: "Per-file affected text; populated on dry runs only",
  })
  preview: SlicePreviewFile[];

  @Field(() => Number)
  errorsBefore: number;

  @Field(() => Number)
  errorsAfter: number;

  @Field(() => [SliceWriteError])
  newErrors: SliceWriteError[];

  @Field(() => Boolean, {
    description:
      "True only when the write adds no bean-check error; gate a preview on this.",
  })
  valid: boolean;

  @Field(() => String, {
    nullable: true,
    description: COMMIT_SHA_DESCRIPTION,
  })
  commit?: string;
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
    return {
      ...result,
      preview: result.preview ?? [],
      errorsBefore: result.validation.errorsBefore,
      errorsAfter: result.validation.errorsAfter,
      newErrors: result.validation.newErrors,
      valid: result.validation.valid,
    };
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
    return {
      ...result,
      preview: result.preview ?? [],
      errorsBefore: result.validation.errorsBefore,
      errorsAfter: result.validation.errorsAfter,
      newErrors: result.validation.newErrors,
      valid: result.validation.valid,
    };
  }

  @Authenticated()
  @Mutation(() => MoveEntrySourcesResponse, {
    description: `${MOVE_ENTRIES_DESCRIPTION} dryRun previews without committing: each moved entry's text and file. revertLedgerCommit undoes the commit.`,
  })
  async moveLedgerEntrySources(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Arg("input", () => MoveEntrySourcesInput) input: MoveEntrySourcesInput,
    @Ctx() ctx: IContext,
  ): Promise<MoveEntrySourcesResponse> {
    const { validation, ...result } =
      await this.journalService.moveSourceSlices({
        ledgerId,
        identity: ctx.getCurrentIdentity(),
        entries: input.entries.map((e) => ({
          entryHash: resolveEntryHash(e),
          sha256sum: e.sha256sum,
        })),
        toPath: input.toPath,
        includeFrom: input.includeFrom ?? undefined,
        allowInvalid: resolveFlagAlias(
          { primary: input.allow_invalid, legacy: input.allowInvalid },
          ALLOW_INVALID_NAMES,
        ),
        dryRun: resolveFlagAlias(
          { primary: input.dry_run, legacy: input.dryRun },
          DRY_RUN_NAMES,
        ),
      });
    return {
      ...result,
      errorsBefore: validation.errorsBefore,
      errorsAfter: validation.errorsAfter,
      newErrors: validation.newErrors,
      valid: validation.valid,
    };
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
    return {
      ...result,
      preview: result.preview ?? [],
      errorsBefore: result.validation.errorsBefore,
      errorsAfter: result.validation.errorsAfter,
      newErrors: result.validation.newErrors,
      valid: result.validation.valid,
    };
  }
}
