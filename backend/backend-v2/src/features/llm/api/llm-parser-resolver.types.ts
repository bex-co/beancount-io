import { Field, ObjectType } from "type-graphql";

@ObjectType()
export class ParsedRow {
  @Field(() => String)
  date: string;

  @Field(() => String)
  payee: string;

  @Field(() => String)
  description: string;

  @Field(() => Number)
  amount: number;
}

@ObjectType()
export class FileParseResult {
  @Field(() => [ParsedRow])
  rows: ParsedRow[];
}

@ObjectType()
export class ReceiptParseResult {
  @Field(() => String, { nullable: true })
  date: string | null;

  @Field(() => String)
  payee: string;

  @Field(() => String)
  description: string;

  @Field(() => Number)
  amount: number;

  @Field(() => String, { nullable: true })
  sourceAccount?: string;

  @Field(() => String, { nullable: true })
  targetAccount?: string;
}
