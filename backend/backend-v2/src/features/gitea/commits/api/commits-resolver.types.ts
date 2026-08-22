import { ObjectType, Field, Int } from "type-graphql";

@ObjectType()
export class CommitAuthor {
  @Field(() => String)
  name: string;

  @Field(() => String)
  email: string;

  @Field(() => String)
  date: string;
}

@ObjectType()
export class CommitFileChange {
  @Field(() => String)
  filename: string;

  @Field(() => Int)
  additions: number;

  @Field(() => Int)
  deletions: number;
}

@ObjectType()
export class CommitStats {
  @Field(() => Int)
  additions: number;

  @Field(() => Int)
  deletions: number;

  @Field(() => Int)
  total: number;
}

@ObjectType()
export class CommitListItem {
  @Field(() => String)
  sha: string;

  @Field(() => String)
  message: string;

  @Field(() => CommitAuthor)
  author: CommitAuthor;

  @Field(() => CommitAuthor, { nullable: true })
  committer?: CommitAuthor;

  @Field(() => String, { nullable: true })
  shortSha?: string; // First 7 characters
}

@ObjectType()
export class CommitDetails {
  @Field(() => String)
  sha: string;

  @Field(() => String)
  message: string;

  @Field(() => CommitAuthor)
  author: CommitAuthor;

  @Field(() => CommitAuthor, { nullable: true })
  committer?: CommitAuthor;

  @Field(() => [CommitFileChange])
  files: CommitFileChange[];

  @Field(() => CommitStats)
  stats: CommitStats;

  @Field(() => String, { nullable: true })
  diff?: string; // Full unified diff

  @Field(() => [String], { nullable: true })
  parents?: string[]; // Parent commit SHAs
}
