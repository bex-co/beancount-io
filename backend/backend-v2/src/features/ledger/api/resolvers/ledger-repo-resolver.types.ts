import { Field, ObjectType } from "type-graphql";

@ObjectType()
export class LedgerCommitUser {
  @Field(() => String, { nullable: true })
  login: string | null;

  @Field(() => String, { nullable: true })
  fullName: string | null;

  @Field(() => String, { nullable: true })
  email: string | null;
}

@ObjectType()
export class LedgerCommit {
  @Field(() => String)
  sha: string;

  @Field(() => String, { nullable: true })
  message: string | null;

  @Field(() => LedgerCommitUser, { nullable: true })
  author: LedgerCommitUser | null;

  @Field(() => LedgerCommitUser, { nullable: true })
  committer: LedgerCommitUser | null;

  @Field(() => String, { nullable: true })
  created: string | null;
}
