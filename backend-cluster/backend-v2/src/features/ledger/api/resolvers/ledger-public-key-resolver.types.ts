import { ArgsType, Field, ObjectType } from "type-graphql";

@ObjectType()
export class PublicKey {
  @Field(() => Number)
  id: number;

  @Field(() => String)
  fingerprint: string;

  @Field(() => String)
  key: string;

  @Field(() => String, { nullable: true })
  lastUsedAt?: string;

  @Field(() => String)
  title: string;

  @Field(() => String)
  createdAt: string;
}

@ArgsType()
export class ListPublicKeysArgs {
  @Field(() => Number, { nullable: true })
  page?: number;

  @Field(() => Number, { nullable: true })
  limit?: number;
}

@ArgsType()
export class CreatePublicKeyInput {
  @Field(() => String)
  key: string;

  @Field(() => String)
  title: string;

  @Field(() => Boolean, { nullable: true, defaultValue: false })
  readOnly?: boolean;
}

@ObjectType()
export class DeletePublicKeyResponse {
  @Field(() => Number)
  id: number;
}
