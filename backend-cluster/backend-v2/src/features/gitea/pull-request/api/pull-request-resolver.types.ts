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

  @Field(() => String, {
    description: "Must not be empty",
  })
  title: string;

  @Field(() => String, {
    description: "Must not be empty — describe what the pull request changes and why",
  })
  description: string;

  @Field(() => String, { defaultValue: "main" })
  baseBranch: string;

  @Field(() => String, {
    description:
      "Commit message for the pull request branch's file changes; must not be empty",
  })
  clearCommitMessage: string;

  @Field(() => Boolean, {
    nullable: true,
    description:
      "Skip the diff-less verification and open the pull request even when the branch does not differ from base",
  })
  fastForward?: boolean;

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

  @Field(() => String, {
    nullable: true,
    description: "The created PR's actual base ref, read back — never a default",
  })
  baseBranch?: string;

  @Field(() => String, {
    nullable: true,
    description: "The created PR's actual head ref, read back — never a default",
  })
  headBranch?: string;
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
