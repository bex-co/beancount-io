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
import { IContext } from "@/server/graphql/context";
import { AllowAnonymous, Authenticated } from "@/server/graphql/authenticated";
import type { IAccountService } from "@/features/auth/service/account-service";

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
  constructor(private readonly accountService: IAccountService) {}

  // This nullable field is the dashboard's identity probe, so an anonymous
  // caller must reach the resolver and receive null. The global GraphQL scope
  // middleware still classifies Query.userProfile as a read and enforces
  // ledger.read when a scoped OAuth or API-key identity is present.
  @AllowAnonymous()
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
    if (!ctx.userId) {
      return null;
    }
    const identity = ctx.getCurrentIdentity();
    const userId = args.userId ?? identity.userId;
    return this.accountService.getUserProfile(identity, userId);
  }

  @Authenticated()
  @Mutation(() => Boolean, {
    description: "delete user account and its associated data",
  })
  public async deleteAccount(@Ctx() ctx: IContext): Promise<boolean> {
    return this.accountService.deleteAccount(ctx.getCurrentIdentity());
  }

  @Authenticated()
  @Query(() => [SearchUser])
  public async getUserByExactMatch(
    @Ctx() ctx: IContext,
    @Args() args: SearchUserInput,
  ): Promise<SearchUser[]> {
    const users = await this.accountService.findUsersByEmailOrUsername(
      ctx.getCurrentIdentity(),
      args.keyword,
      Boolean(args.includeCurrentUser),
    );
    return users.map((u) => ({ email: u.email, username: u.ledger_username }));
  }

  @Authenticated()
  @Mutation(() => UserProfileResponse)
  public async updateUsername(
    @Ctx() ctx: IContext,
    @Args() args: UpdateUsernameInput,
  ): Promise<UserProfileResponse | null> {
    return this.accountService.updateUsername(
      ctx.getCurrentIdentity(),
      args.username,
    );
  }

  @Authenticated()
  @Mutation(() => UserProfileResponse, {
    description: "Update user profile (firstName and lastName)",
  })
  public async updateProfile(
    @Ctx() ctx: IContext,
    @Args() args: UpdateProfileInput,
  ): Promise<UserProfileResponse | null> {
    return this.accountService.updateProfile(
      ctx.getCurrentIdentity(),
      args.firstName ?? "",
      args.lastName ?? "",
    );
  }
}
