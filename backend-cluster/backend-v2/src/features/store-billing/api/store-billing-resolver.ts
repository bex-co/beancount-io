import { Ctx, Field, ObjectType, Query, Resolver } from "type-graphql";
import type { IContext } from "@/server/graphql/context";
import { Authenticated } from "@/server/graphql/authenticated";
import type { IStoreBillingService } from "../service/store-billing-service";

@ObjectType("StoreBillingIdentity", {
  description:
    "What the app attaches to a store purchase so the purchase names this account.",
})
class StoreBillingIdentity {
  @Field({ description: "Apple's appAccountToken." })
  appleAppAccountToken!: string;

  @Field({ description: "Google Play's obfuscated account ID." })
  googleObfuscatedAccountId!: string;
}

/** GraphQL is an adapter; all billing policy and work live in the service. */
@Resolver()
export class StoreBillingResolver {
  constructor(private readonly storeBilling: IStoreBillingService) {}

  @Authenticated()
  @Query(() => StoreBillingIdentity, {
    description:
      "Returns your store billing identifiers, creating them on first read. Requires a full signed-in session or the Beancount app.",
  })
  async storeBillingIdentity(
    @Ctx() context: IContext,
  ): Promise<StoreBillingIdentity> {
    return this.storeBilling.storeBillingIdentity(context.getCurrentIdentity());
  }
}
