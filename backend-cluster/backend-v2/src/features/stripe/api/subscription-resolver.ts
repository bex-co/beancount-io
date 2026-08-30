import {
  Arg,
  Ctx,
  Field,
  ID,
  Info,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from "type-graphql";
import { type GraphQLResolveInfo, Kind } from "graphql";
import type { ISubscriptionService } from "@/features/stripe/service/subscription-service";
import type { IContext } from "@/server/graphql/context";
import { AllowAnonymous, Authenticated } from "@/server/graphql/authenticated";

@ObjectType("SubscriptionPrice")
class SubscriptionPrice {
  @Field(() => ID)
  id!: string;

  @Field()
  amount!: number;

  @Field()
  currency!: string;

  @Field()
  interval!: string;

  @Field({ nullable: true })
  intervalCount?: number;

  @Field({ nullable: true })
  trialPeriodDays?: number;
}

@ObjectType("SubscriptionProduct")
class SubscriptionProduct {
  @Field(() => ID)
  id!: string;

  @Field()
  name!: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => [String], { nullable: true })
  images?: string[];
}

@ObjectType("SubscriptionItem")
class SubscriptionItem {
  @Field(() => ID)
  id!: string;

  @Field(() => SubscriptionPrice)
  price!: SubscriptionPrice;

  @Field(() => SubscriptionProduct, { nullable: true })
  product?: SubscriptionProduct;

  @Field()
  quantity!: number;
}

@ObjectType("Subscription")
class Subscription {
  @Field(() => ID)
  id!: string;

  @Field()
  status!: string;

  @Field()
  currentPeriodStart!: Date;

  @Field()
  currentPeriodEnd!: Date;

  @Field({ nullable: false })
  clientId!: string;

  @Field({ nullable: true })
  cancelAt?: Date;

  @Field({ nullable: true })
  canceledAt?: Date;

  @Field()
  cancelAtPeriodEnd!: boolean;

  @Field(() => [SubscriptionItem])
  items!: SubscriptionItem[];
}

@ObjectType("CustomerSubscriptionStatus")
class CustomerSubscriptionStatus {
  @Field()
  hasActiveSubscription!: boolean;

  @Field(() => [Subscription])
  subscriptions!: Subscription[];
}

@ObjectType("SubscriptionActionResult")
class SubscriptionActionResult {
  @Field()
  success!: boolean;

  @Field({ nullable: true })
  message?: string;
}

@ObjectType("UpgradeSubscriptionResult")
class UpgradeSubscriptionResult {
  @Field()
  success!: boolean;

  @Field({ nullable: true })
  message?: string;

  @Field({ nullable: true })
  clientSecret?: string;

  @Field({ nullable: true })
  subscriptionId?: string;

  @Field({ nullable: true })
  newTier?: string;
}

@ObjectType("SubscriptionSessionResult")
class SubscriptionSessionResult {
  @Field()
  success!: boolean;

  @Field({ nullable: true })
  message?: string;

  @Field({ nullable: true })
  sessionId?: string;

  @Field({ nullable: true })
  sessionUrl?: string;
}

@ObjectType("TierQuotaItem")
class TierQuotaItem {
  @Field(() => String)
  tier!: string;

  @Field(() => Number)
  aiCfoTokensMax!: number;

  @Field(() => Number)
  maxLedgers!: number;

  @Field(() => Number)
  maxCollaboratorsPerLedger!: number;

  @Field(() => Number)
  maxDirectives!: number;
}

function isOnlyHasActiveSubscriptionRequested(
  info: GraphQLResolveInfo,
): boolean {
  const selections = info.fieldNodes[0]?.selectionSet?.selections ?? [];
  if (selections.length !== 1) return false;
  const selection = selections[0];
  return (
    selection.kind === Kind.FIELD &&
    selection.name.value === "hasActiveSubscription"
  );
}

/** GraphQL is an adapter; all billing policy and work live in the service. */
@Resolver()
export class SubscriptionResolver {
  constructor(private readonly subscriptions: ISubscriptionService) {}

  @AllowAnonymous()
  @Query(() => [TierQuotaItem], {
    description: "Returns the public quota limits for all subscription tiers.",
  })
  async allTierQuotas(): Promise<TierQuotaItem[]> {
    return this.subscriptions.allTierQuotas();
  }

  @Authenticated()
  @Query(() => CustomerSubscriptionStatus, {
    description:
      "Returns your subscription status. Requires a full signed-in session.",
  })
  async subscriptionStatus(
    @Ctx() context: IContext,
    @Info() info: GraphQLResolveInfo,
  ): Promise<CustomerSubscriptionStatus> {
    return this.subscriptions.subscriptionStatus(
      context.getCurrentIdentity(),
      isOnlyHasActiveSubscriptionRequested(info),
    );
  }

  @Authenticated()
  @Mutation(() => SubscriptionSessionResult, {
    description:
      "Creates a Stripe-hosted checkout session. Requires a full signed-in session.",
  })
  async createSubscriptionSession(
    @Arg("clientId") clientId: string,
    @Arg("priceId") priceId: string,
    @Ctx() context: IContext,
  ): Promise<SubscriptionSessionResult> {
    return this.subscriptions.createSubscriptionSession(
      context.getCurrentIdentity(),
      clientId,
      priceId,
    );
  }

  @Authenticated()
  @Mutation(() => SubscriptionSessionResult, {
    description:
      "Creates a Stripe-hosted customer portal session. Requires a full signed-in session.",
  })
  async createStripePortalSession(
    @Arg("clientId") clientId: string,
    @Ctx() context: IContext,
  ): Promise<SubscriptionSessionResult> {
    return this.subscriptions.createStripePortalSession(
      context.getCurrentIdentity(),
      clientId,
    );
  }

  @Authenticated()
  @Mutation(() => SubscriptionActionResult, {
    description:
      "Schedules your subscription to cancel. Requires a full signed-in session.",
  })
  async cancelSubscription(
    @Arg("subscriptionId") subscriptionId: string,
    @Arg("clientId") clientId: string,
    @Ctx() context: IContext,
  ): Promise<SubscriptionActionResult> {
    return this.subscriptions.cancelSubscription(
      context.getCurrentIdentity(),
      subscriptionId,
      clientId,
    );
  }

  @Authenticated()
  @Mutation(() => SubscriptionActionResult, {
    description:
      "Resumes your subscription. Requires a full signed-in session.",
  })
  async resumeSubscription(
    @Arg("subscriptionId") subscriptionId: string,
    @Arg("clientId") clientId: string,
    @Ctx() context: IContext,
  ): Promise<SubscriptionActionResult> {
    return this.subscriptions.resumeSubscription(
      context.getCurrentIdentity(),
      subscriptionId,
      clientId,
    );
  }

  @Authenticated()
  @Mutation(() => UpgradeSubscriptionResult, {
    description:
      "Upgrades your subscription. Requires a full signed-in session.",
  })
  async upgradeSubscription(
    @Arg("clientId") clientId: string,
    @Arg("priceId") priceId: string,
    @Ctx() context: IContext,
  ): Promise<UpgradeSubscriptionResult> {
    return this.subscriptions.upgradeSubscription(
      context.getCurrentIdentity(),
      clientId,
      priceId,
    );
  }
}
