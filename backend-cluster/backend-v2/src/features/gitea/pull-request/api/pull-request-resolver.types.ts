import { ObjectType, Field, InputType, Int } from "type-graphql";

@InputType()
export class FileChangeInput {
  @Field(() => String)
  path: string;

  @Field(() => String)
  content: string;
}

@InputType()
export class CreatePRFromPatchInput {
  @Field(() => String)
  ledgerOwner: string;

  @Field(() => String)
  ledgerName: string;

  @Field(() => String)
  title: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => String, { defaultValue: "main" })
  baseBranch: string;

  @Field(() => [FileChangeInput])
  changes: FileChangeInput[];
}

@ObjectType()
export class PullRequestResult {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String, { nullable: true })
  message?: string;

  @Field(() => Int, { nullable: true })
  prNumber?: number;

  @Field(() => String, { nullable: true })
  prUrl?: string;
}

@ObjectType()
export class PRFileChange {
  @Field(() => String)
  filename: string;

  @Field(() => Int)
  additions: number;

  @Field(() => Int)
  deletions: number;

  @Field(() => Int)
  changes: number;
}

@ObjectType()
export class PullRequestDetails {
  @Field(() => Int)
  number: number;

  @Field(() => String)
  title: string;

  @Field(() => String)
  description: string;

  @Field(() => String)
  state: string; // "open", "closed", "merged"

  @Field(() => String)
  author: string;

  @Field(() => String)
  headBranch: string;

  @Field(() => String)
  baseBranch: string;

  @Field(() => [PRFileChange])
  files: PRFileChange[];

  @Field(() => String, { nullable: true })
  diff?: string; // Full diff content
}
