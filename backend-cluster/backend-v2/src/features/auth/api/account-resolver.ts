import {
  Args,
  ArgsType,
  Ctx,
  Field,
  Mutation,
  ObjectType,
  Query,
} from "type-graphql";
import { MaxLength, MinLength } from "class-validator";
import { ReportStatus } from "@/features/auth/utils/report-status";
import {
  IContext,
  authorizationRequestFromContext,
} from "@/server/graphql/context";
import type { IAccountWorkflow } from "@/features/auth/workflow/account-workflow";

@ArgsType()
class UserProfileRequest {
  @Field(() => String, { nullable: true })
  userId?: string;
}

@ObjectType()
class UserLimits {
  /** Current number of ledgers created */
  @Field(() => Number)
  ledgersUsed: number;

  /** Maximum number of ledgers allowed for this tier */
  @Field(() => Number)
  ledgersMax: number;

  /** Maximum number of collaborators allowed per ledger for this tier */
  @Field(() => Number)
  collaboratorsPerLedgerMax: number;

  /** Maximum number of beancount directives allowed per ledger for this tier (-1 = unlimited) */
  @Field(() => Number)
  maxDirectives: number;
}

@ObjectType()
class UserProfileResponse {
  @Field(() => String)
  id: string;

  @Field(() => String)
  email: string;

  @Field(() => String)
  locale: string;

  @Field(() => String, { nullable: true })
  firstName?: string;

  @Field(() => String, { nullable: true })
  lastName?: string;

  @Field(() => ReportStatus, { nullable: true })
  emailReportStatus?: ReportStatus;

  @Field(() => String, { nullable: true })
  username: string;

  @Field(() => String)
  tier: string;

  @Field(() => UserLimits)
  limits: UserLimits;

  /** Whether the user has ever had a subscription (past or present) */
  @Field(() => Boolean)
  hasEverSubscribed: boolean;
}

@ObjectType()
class SearchUser {
  @Field(() => String)
  public email: string;

  @Field(() => String)
  public username: string;
}

@ArgsType()
export class SearchUserInput {
  @Field(() => String)
  @MinLength(3, { message: "Search keyword must be at least 3 characters" })
  @MaxLength(320, {
    message: "Search keyword must be at most 320 characters",
  })
  public keyword: string;

  @Field(() => String, { nullable: true })
  public includeCurrentUser?: boolean | null;
}

@ArgsType()
class UpdateUsernameInput {
  @Field(() => String)
  public username: string;
}

@ArgsType()
class UpdateProfileInput {
  @Field(() => String, { nullable: true })
  public firstName?: string | null;

  @Field(() => String, { nullable: true })
  public lastName?: string | null;
}

export class AccountResolver {
  constructor(private readonly accountWorkflow: IAccountWorkflow) {}

  @Query(() => UserProfileResponse, {
    description: "get the user",
    nullable: true,
  })
  public async userProfile(
    @Args()
    args: UserProfileRequest,
    @Ctx()
    ctx: IContext,
  ): Promise<UserProfileResponse | null> {
    if (!ctx.identity) return null;
    const userId = args.userId ?? ctx.identity.userId;
    return this.accountWorkflow.getUserProfile(
      authorizationRequestFromContext(ctx),
      userId,
    );
  }

  @Mutation(() => Boolean, {
    description: "delete user account and its associated data",
  })
  public async deleteAccount(@Ctx() ctx: IContext): Promise<boolean> {
    return this.accountWorkflow.deleteAccount(
      authorizationRequestFromContext(ctx),
    );
  }

  @Query(() => [SearchUser])
  public async getUserByExactMatch(
    @Ctx() ctx: IContext,
    @Args() args: SearchUserInput,
  ): Promise<SearchUser[]> {
    const users = await this.accountWorkflow.findUsersByEmailOrUsername(
      authorizationRequestFromContext(ctx),
      args.keyword,
      Boolean(args.includeCurrentUser),
    );
    return users.map((u) => ({ email: u.email, username: u.ledger_username }));
  }

  @Mutation(() => UserProfileResponse)
  public async updateUsername(
    @Ctx() ctx: IContext,
    @Args() args: UpdateUsernameInput,
  ): Promise<UserProfileResponse | null> {
    return this.accountWorkflow.updateUsername(
      authorizationRequestFromContext(ctx),
      args.username,
    );
  }

  @Mutation(() => UserProfileResponse, {
    description: "Update user profile (firstName and lastName)",
  })
  public async updateProfile(
    @Ctx() ctx: IContext,
    @Args() args: UpdateProfileInput,
  ): Promise<UserProfileResponse | null> {
    return this.accountWorkflow.updateProfile(
      authorizationRequestFromContext(ctx),
      args.firstName ?? "",
      args.lastName ?? "",
    );
  }
}
