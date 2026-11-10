import {
  ArgsType,
  Field,
  InputType,
  ObjectType,
  registerEnumType,
} from "type-graphql";
import {
  IsEnum,
  IsOptional,
  MaxLength,
  Matches,
  type ValidationArguments,
} from "class-validator";
import {
  NEW_LEDGER_NAME_PATTERN,
  newLedgerNameRule,
} from "@/shared/ledger-slug";
import { GraphQLJSONObject } from "graphql-scalars";
import {
  LEDGER_DESCRIPTION_MAX,
  LedgerTemplate,
} from "@/features/ledger/workflow/ledger-workflow.types";
import {
  REVERT_MESSAGE_DESCRIPTION,
  REVERT_SHA_DESCRIPTION,
  COMMIT_SHA_DESCRIPTION,
} from "@/features/ledger/utils/commit-revert";
import { PREVIEW_FLAG_DESCRIPTION } from "@/features/ledger/utils/preview-flag-description";

registerEnumType(LedgerTemplate, {
  name: "LedgerTemplate",
  description: "Template used to populate a newly created ledger",
});

export enum LedgerSetupPreset {
  PERSONAL = "personal@1",
  FREELANCE = "freelance@1",
  BUSINESS = "business@1",
  PORTFOLIO = "portfolio@1",
  RENTAL = "rental@1",
  SHARED_EXPENSES = "shared-expenses@1",
  COMMUNITY = "community@1",
  BLANK = "blank@1",
}

registerEnumType(LedgerSetupPreset, {
  name: "LedgerSetupPreset",
  description: "Versioned starter preset from the setup catalog (ADR026)",
});

export enum LedgerSetupModule {
  INVESTMENTS = "investments@1",
  RENTAL_PROPERTY = "rental-property@1",
  SIDE_BUSINESS = "side-business@1",
}

registerEnumType(LedgerSetupModule, {
  name: "LedgerSetupModule",
  description:
    "Versioned personal-only account group from the setup catalog (ADR026 personal modules)",
});

export enum LedgerOpeningState {
  UNKNOWN = "unknown",
  ZERO = "zero",
  KNOWN = "known",
}

registerEnumType(LedgerOpeningState, {
  name: "LedgerOpeningState",
  description:
    "Whether an account's opening balance is unknown, zero, or known",
});

@InputType()
export class LedgerSetupAccountInput {
  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  currency?: string;

  @Field(() => LedgerOpeningState, { nullable: true })
  openingState?: LedgerOpeningState;

  @Field(() => String, {
    nullable: true,
    description: "Decimal amount; required when openingState is KNOWN.",
  })
  amount?: string;
}

@InputType()
export class LedgerSetupModuleInput {
  @Field(() => LedgerSetupModule)
  id: LedgerSetupModule;

  @Field(() => String, {
    nullable: true,
    description:
      "rental-property@1 only: the property's ASCII account component, default Property1.",
  })
  propertyName?: string;
}

@InputType()
export class LedgerSetupInput {
  @Field(() => LedgerSetupPreset)
  preset: LedgerSetupPreset;

  @Field(() => [LedgerSetupModuleInput], {
    nullable: true,
    description:
      "Account groups added to a PERSONAL ledger, each at most once. Refused with any other preset.",
  })
  modules?: LedgerSetupModuleInput[];

  @Field(() => String, { nullable: true })
  title?: string;

  @Field(() => String, { nullable: true })
  operatingCurrency?: string;

  @Field(() => String, { nullable: true })
  historyStart?: string;

  @Field(() => GraphQLJSONObject, {
    nullable: true,
    description:
      "Per optional question: enabled, declined, or deferred, keyed by question id.",
  })
  capabilities?: Record<string, string>;

  @Field(() => [LedgerSetupAccountInput], { nullable: true })
  accounts?: LedgerSetupAccountInput[];
}

@ObjectType()
class LedgerSetupValidationError {
  @Field(() => String)
  message: string;

  @Field(() => String, { nullable: true })
  source?: string;
}

@ObjectType()
class LedgerSetupValidation {
  @Field(() => Boolean)
  ok: boolean;

  @Field(() => [LedgerSetupValidationError])
  errors: LedgerSetupValidationError[];
}

@ObjectType()
export class LedgerSetupPreview {
  @Field(() => String)
  preset: string;

  @Field(() => String)
  operatingCurrency: string;

  @Field(() => String)
  historyStart: string;

  @Field(() => [String])
  accounts: string[];

  @Field(() => GraphQLJSONObject)
  files: Record<string, string>;

  @Field(() => LedgerSetupValidation, {
    description:
      "bean-check's verdict on the files; creation refuses on errors.",
  })
  validation: LedgerSetupValidation;
}

@ObjectType()
export class Permission {
  @Field(() => Boolean)
  admin: boolean;

  @Field(() => Boolean)
  pull: boolean;

  @Field(() => Boolean)
  push: boolean;
}

@ObjectType()
export class LedgerUpdateStringChange {
  @Field(() => String)
  from: string;

  @Field(() => String)
  to: string;
}

@ObjectType()
export class LedgerUpdateNullableStringChange {
  @Field(() => String, { nullable: true })
  from: string | null;

  @Field(() => String)
  to: string;
}

@ObjectType()
export class LedgerUpdateBooleanChange {
  @Field(() => Boolean)
  from: boolean;

  @Field(() => Boolean)
  to: boolean;
}

@ObjectType()
export class LedgerUpdatePreview {
  @Field(() => LedgerUpdateStringChange, { nullable: true })
  name?: LedgerUpdateStringChange;

  @Field(() => LedgerUpdateNullableStringChange, { nullable: true })
  description?: LedgerUpdateNullableStringChange;

  @Field(() => LedgerUpdateBooleanChange, {
    nullable: true,
    description: "Current and new visibility, when changing it.",
  })
  private?: LedgerUpdateBooleanChange;

  @Field(() => [String])
  warnings: string[];
}

@ObjectType()
export class Ledger {
  @Field(() => String)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => String)
  fullName: string;

  @Field(() => String)
  sshUrl: string;

  @Field(() => String)
  httpUrl: string;

  @Field(() => Boolean)
  empty: boolean;

  @Field(() => Boolean)
  private: boolean;

  @Field(() => String)
  createdAt: string;

  @Field(() => String)
  updatedAt: string;

  @Field(() => Number)
  size: number;

  @Field(() => Permission, { nullable: true })
  permissions?: Permission;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => Boolean, { nullable: true })
  isStarred?: boolean;

  @Field(() => Boolean, {
    nullable: true,
    description:
      "True when this is an updateLedger preview: the checks ran and nothing was committed. Reads and creates omit it.",
  })
  dryRun?: boolean;

  @Field(() => LedgerUpdatePreview, {
    nullable: true,
    description:
      "The rendered current→new diff; present only on updateLedger previews.",
  })
  preview?: LedgerUpdatePreview;
}

@ObjectType()
export class LedgerFileContent {
  @Field(() => String)
  name: string;

  @Field(() => String)
  path: string;

  @Field(() => String)
  type: string;

  @Field(() => String)
  sha: string;

  @Field(() => Number)
  size: number;

  @Field(() => String, { nullable: true })
  content?: string;

  @Field(() => String, { nullable: true })
  encoding?: string;

  @Field(() => String, { nullable: true })
  lastCommitSha?: string;

  @Field(() => String, {
    nullable: true,
    description: COMMIT_SHA_DESCRIPTION,
  })
  commit?: string;

  @Field(() => String, { nullable: true })
  lastCommitterDate?: string;

  @Field(() => String, { nullable: true })
  lastAuthorDate?: string;

  @Field(() => [String], {
    nullable: true,
    description:
      "On a create or update: ledger files the write made that no loaded file includes. Their entries don't count and bean-check did not read them.",
  })
  notLoaded?: string[];
}

@ArgsType()
export class CreateLedgerInput {
  @Field(() => String)
  @MaxLength(100, {
    message: "Name must be at most 100 characters long",
  })
  @Matches(NEW_LEDGER_NAME_PATTERN, {
    message: ({ value }: ValidationArguments) =>
      newLedgerNameRule(String(value)),
  })
  name: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @MaxLength(LEDGER_DESCRIPTION_MAX, {
    message: `A ledger description can be at most ${LEDGER_DESCRIPTION_MAX} characters`,
  })
  description?: string;

  @Field(() => Boolean, {
    nullable: true,
    description:
      "true or omitted keeps the ledger visible only to its owner and collaborators; false makes it public, readable by anyone.",
  })
  private?: boolean;

  @Field(() => LedgerTemplate, { nullable: true })
  @IsOptional()
  @IsEnum(LedgerTemplate)
  template?: LedgerTemplate;

  @Field(() => LedgerSetupInput, {
    nullable: true,
    description:
      "Setup specification (ADR026); mutually exclusive with template.",
  })
  @IsOptional()
  setup?: LedgerSetupInput;

  @Field(() => String, {
    nullable: true,
    description:
      "Client-generated idempotency identifier: a retry with the same id and request returns the original ledger.",
  })
  @IsOptional()
  requestId?: string;
}

@ArgsType()
export class UpdateLedgerInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @MaxLength(100, {
    message: "Name must be at most 100 characters long",
  })
  @Matches(NEW_LEDGER_NAME_PATTERN, {
    message: ({ value }: ValidationArguments) =>
      newLedgerNameRule(String(value)),
  })
  name?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @MaxLength(LEDGER_DESCRIPTION_MAX, {
    message: `A ledger description can be at most ${LEDGER_DESCRIPTION_MAX} characters`,
  })
  description?: string;

  @Field(() => Boolean, {
    nullable: true,
    description:
      "true makes the ledger visible only to its owner and collaborators; false makes it public, readable by anyone; omitted leaves it as it is.",
  })
  private?: boolean;

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

@ArgsType()
export class CreateLedgerFileInput {
  @Field(() => String)
  path: string;

  @Field(() => String, {
    description:
      "Base64-encoded file content, at most 1 MiB (1,048,576 decoded bytes).",
  })
  content: string;

  @Field(() => String, { nullable: true })
  message?: string;

  @Field(() => String, {
    nullable: true,
    description: "Alias of message, as the MCP file tools spell it.",
  })
  description?: string;
}

@ArgsType()
export class UpdateLedgerFileInput {
  @Field(() => String)
  path: string;

  @Field(() => String, {
    description:
      "Base64-encoded full replacement content, at most 1 MiB (1,048,576 decoded bytes).",
  })
  content: string;

  @Field(() => String)
  sha: string;

  @Field(() => String, { nullable: true })
  message?: string;

  @Field(() => String, {
    nullable: true,
    description: "Alias of message, as the MCP file tools spell it.",
  })
  description?: string;
}

@ArgsType()
export class DeleteLedgerFileInput {
  @Field(() => String)
  path: string;

  @Field(() => String)
  sha: string;

  @Field(() => String, { nullable: true })
  message?: string;

  @Field(() => String, {
    nullable: true,
    description: "Alias of message, as the MCP file tools spell it.",
  })
  description?: string;

  @Field(() => Boolean, {
    nullable: true,
    description:
      "Also drop the exact `include` lines of other ledger files that reach this file, in the same commit. Without it, deleting an included file is refused. Glob includes are left as they are.",
  })
  removeIncludes?: boolean;
}

@ArgsType()
export class RenameLedgerFileInput {
  @Field(() => String)
  newPath: string;

  @Field(() => String)
  oldPath: string;

  @Field(() => String, { nullable: true })
  message?: string;

  @Field(() => String, {
    nullable: true,
    description: "Alias of message, as the MCP file tools spell it.",
  })
  description?: string;

  @Field(() => Boolean, { nullable: true })
  updateIncludes?: boolean;

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

@ArgsType()
export class RevertLedgerCommitInput {
  @Field(() => String, { description: REVERT_SHA_DESCRIPTION })
  sha: string;

  @Field(() => String, {
    nullable: true,
    description: REVERT_MESSAGE_DESCRIPTION,
  })
  message?: string;

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

@ArgsType()
export class ListLedgersArgs {
  @Field(() => Number, { nullable: true })
  page?: number;

  @Field(() => Number, { nullable: true })
  limit?: number;
}

@ArgsType()
export class SearchLedgersArgs {
  @Field(() => String, { nullable: true })
  q?: string;

  @Field(() => Boolean, { nullable: true })
  topic?: boolean;

  @Field(() => Boolean, { nullable: true })
  includeDesc?: boolean;

  @Field(() => Number, { nullable: true })
  uid?: number;

  @Field(() => Number, { nullable: true })
  priorityOwnerId?: number;

  @Field(() => Number, { nullable: true })
  teamId?: number;

  @Field(() => Number, { nullable: true })
  starredBy?: number;

  @Field(() => Boolean, { nullable: true })
  private?: boolean;

  @Field(() => Boolean, { nullable: true })
  isPrivate?: boolean;

  @Field(() => Boolean, { nullable: true })
  template?: boolean;

  @Field(() => Boolean, { nullable: true })
  archived?: boolean;

  @Field(() => String, { nullable: true })
  mode?: string;

  @Field(() => Boolean, { nullable: true })
  exclusive?: boolean;

  @Field(() => String, { nullable: true })
  sort?: string;

  @Field(() => String, { nullable: true })
  order?: string;

  @Field(() => Number, { nullable: true })
  page?: number;

  @Field(() => Number, { nullable: true })
  limit?: number;
}

@ArgsType()
export class GetLedgerFileArgs {
  @Field(() => String)
  path: string;

  @Field(() => Boolean, {
    nullable: true,
    description:
      "Fail a missing file with NOT_FOUND and a directory path with BAD_USER_INPUT, as REST and MCP do, instead of returning null. Defaults to false so clients that read null as 'no such file' keep working.",
  })
  missingAsError?: boolean;
}

@ArgsType()
export class GetLedgerDirContentArgs {
  @Field(() => String, { nullable: true })
  dirPath?: string | null;
}

@ArgsType()
export class DeleteLedgerInput {
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
export class LedgerDeletePreview {
  @Field(() => String)
  ledgerId: string;

  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  description: string | null;

  @Field(() => Boolean)
  private: boolean;

  @Field(() => Boolean)
  empty: boolean;

  @Field(() => Number)
  size: number;

  @Field(() => [String])
  warnings: string[];
}

@ObjectType()
export class DeleteLedgerResponse {
  @Field(() => String)
  ledgerId: string;

  @Field(() => Boolean, {
    nullable: true,
    description:
      "True when this is a deleteLedger preview: the checks ran and nothing was destroyed. Commits echo false.",
  })
  dryRun?: boolean;

  @Field(() => LedgerDeletePreview, {
    nullable: true,
    description: "The destroy summary; present only on deleteLedger previews.",
  })
  preview?: LedgerDeletePreview;
}

@ObjectType()
export class DeleteLedgerFileResponse {
  @Field(() => String)
  path: string;

  @Field(() => String, {
    nullable: true,
    description: COMMIT_SHA_DESCRIPTION,
  })
  commit?: string;
}

@ObjectType()
export class RenamePreviewFile {
  @Field(() => String)
  path: string;

  @Field(() => String)
  text: string;
}

/** A bean-check error the write adds, as the append result publishes it. */
@ObjectType()
export class SliceWriteError {
  @Field(() => String)
  message: string;

  @Field(() => String, { nullable: true })
  source?: string;

  // MCP and REST carry the engine's code; so does GraphQL (w1/220).
  @Field(() => String, {
    nullable: true,
    description: "The engine's stable error code, such as E3001",
  })
  code?: string;
}

/**
 * bean-check around a write that previews by projection and commits by reading
 * the ledger back: the fields REST publishes flat and MCP under `validation`
 * (w23/233).
 */
@ObjectType()
class WriteVerdict {
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

  @Field(() => Boolean, {
    nullable: true,
    description:
      "Present, as false, when bean-check could not run, so the other fields say nothing; checkError says why.",
  })
  checked?: false;

  @Field(() => String, { nullable: true })
  checkError?: string;
}

@ObjectType()
export class RenameLedgerFileResponse extends WriteVerdict {
  @Field(() => String)
  message: string;

  @Field(() => Boolean)
  dryRun: boolean;

  @Field(() => String)
  newPath: string;

  @Field(() => String)
  oldPath: string;

  @Field(() => [String])
  updatedIncludes: string[];

  @Field(() => [RenamePreviewFile], {
    description: "Per-file rewritten include lines; populated on dry runs only",
  })
  preview: RenamePreviewFile[];

  @Field(() => String, {
    nullable: true,
    description: COMMIT_SHA_DESCRIPTION,
  })
  commit?: string;
}

@ObjectType()
export class RevertedFile {
  @Field(() => String)
  path: string;

  @Field(() => String, {
    description:
      "What the revert does to the file: created, updated or deleted.",
  })
  change: string;
}

@ObjectType()
export class RevertLedgerCommitResponse extends WriteVerdict {
  @Field(() => String, {
    description: "The full sha of the commit the revert undoes.",
  })
  sha: string;

  @Field(() => String, {
    description: "The first line of that commit's message.",
  })
  subject: string;

  @Field(() => String, { description: "The revert's own commit message." })
  message: string;

  @Field(() => [RevertedFile], {
    description:
      "Each file the commit touched, and what the revert does to it.",
  })
  files: RevertedFile[];

  @Field(() => Boolean)
  dryRun: boolean;

  @Field(() => String, {
    nullable: true,
    description:
      "The sha of the revert commit; absent on a preview, and when another commit landed in between.",
  })
  commit?: string;
}

@ObjectType()
export class StarLedgerResponse {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => Boolean)
  isStarred: boolean;

  @Field(() => String, { nullable: true })
  message?: string;
}
