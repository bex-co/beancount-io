import { ArgsType, Field, ObjectType, registerEnumType } from "type-graphql";
import { IsEnum, IsOptional, MaxLength, Matches } from "class-validator";
import { LedgerTemplate } from "@/features/ledger/workflow/ledger-workflow.types";

registerEnumType(LedgerTemplate, {
  name: "LedgerTemplate",
  description: "Template used to populate a newly created ledger",
});

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

  @Field(() => String, { nullable: true })
  lastCommitterDate?: string;

  @Field(() => String, { nullable: true })
  lastAuthorDate?: string;
}

@ArgsType()
export class CreateLedgerInput {
  @Field(() => String)
  @MaxLength(100, {
    message: "Name must be at most 100 characters long",
  })
  @Matches(/^[a-z0-9_-]+$/, {
    message:
      "Name can only contain lowercase letters, numbers, hyphens, and underscores. The name should already be slugified before submission.",
  })
  name: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => Boolean, { nullable: true })
  private?: boolean;

  @Field(() => LedgerTemplate, { nullable: true })
  @IsOptional()
  @IsEnum(LedgerTemplate)
  template?: LedgerTemplate;
}

@ArgsType()
export class UpdateLedgerInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @MaxLength(100, {
    message: "Name must be at most 100 characters long",
  })
  @Matches(/^[a-z0-9_-]+$/, {
    message:
      "Name can only contain lowercase letters, numbers, hyphens, and underscores. The name should already be slugified before submission.",
  })
  name?: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => Boolean, { nullable: true })
  private?: boolean;
}

@ArgsType()
export class CreateLedgerFileInput {
  @Field(() => String)
  path: string;

  @Field(() => String)
  content: string;

  @Field(() => String, { nullable: true })
  message?: string;
}

@ArgsType()
export class UpdateLedgerFileInput {
  @Field(() => String)
  path: string;

  @Field(() => String)
  content: string;

  @Field(() => String)
  sha: string;

  @Field(() => String, { nullable: true })
  message?: string;
}

@ArgsType()
export class DeleteLedgerFileInput {
  @Field(() => String)
  path: string;

  @Field(() => String)
  sha: string;

  @Field(() => String, { nullable: true })
  message?: string;
}

@ArgsType()
export class RenameLedgerFileInput {
  @Field(() => String)
  newPath: string;

  @Field(() => String)
  oldPath: string;

  @Field(() => String, { nullable: true })
  message?: string;
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
}

@ArgsType()
export class GetLedgerDirContentArgs {
  @Field(() => String, { nullable: true })
  dirPath?: string | null;
}

@ObjectType()
export class DeleteLedgerResponse {
  @Field(() => String)
  ledgerId: string;
}

@ObjectType()
export class DeleteLedgerFileResponse {
  @Field(() => String)
  path: string;
}

@ObjectType()
export class RenameLedgerFileResponse {
  @Field(() => String)
  newPath: string;

  @Field(() => String)
  oldPath: string;
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
