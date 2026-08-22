import { ArgsType, Field, ObjectType, registerEnumType } from "type-graphql";

export enum FeedSource {
  BLOG = "BLOG",
  LEDGER_RSS = "LEDGER_RSS",
}

registerEnumType(FeedSource, {
  name: "FeedSource",
  description: "Source type of the feed item",
});

@ObjectType()
export class FeedItem {
  @Field(() => String)
  id: string;

  @Field(() => String)
  title: string;

  @Field(() => String, { nullable: true })
  summary?: string;

  @Field(() => String)
  link: string;

  @Field(() => Date)
  publishedAt: Date;

  @Field(() => String, { nullable: true })
  author?: string;

  @Field(() => String, { nullable: true })
  authorAvatar?: string;

  @Field(() => FeedSource)
  source: FeedSource;
}

@ObjectType()
export class FeedResponse {
  @Field(() => [FeedItem])
  items: FeedItem[];

  @Field(() => Number)
  total: number;

  @Field(() => Boolean)
  hasMore: boolean;
}

@ArgsType()
export class GetFeedArgs {
  @Field(() => Number, { defaultValue: 0 })
  offset: number;

  @Field(() => Number, { defaultValue: 10 })
  limit: number;

  @Field(() => String, { nullable: true })
  source?: string;

  @Field(() => String, {
    nullable: true,
    description:
      "Language code (en, zh, etc.). If not provided, uses user's profile locale.",
  })
  locale?: string;
}
