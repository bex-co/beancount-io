import { Field, InputType, ObjectType, Float, Int } from "type-graphql";

@InputType()
export class TransactionToCategorizeInput {
  @Field(() => Int)
  rowIndex: number;

  @Field(() => String)
  date: string;

  @Field(() => String)
  payee: string;

  @Field(() => String)
  description: string;

  @Field(() => Float)
  amount: number;
}

@ObjectType()
export class CategorySuggestion {
  @Field(() => Int)
  rowIndex: number;

  @Field(() => String)
  targetAccount: string;

  @Field(() => Float)
  confidence: number;

  @Field(() => String)
  source: string;

  @Field(() => String, { nullable: true })
  reasoning?: string;
}
