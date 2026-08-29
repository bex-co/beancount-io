import {
  Args,
  ArgsType,
  Authorized,
  Ctx,
  Field,
  Mutation,
  ObjectType,
  Query,
} from "type-graphql";
import { MaxLength, MinLength } from "class-validator";
import { ReportStatus } from "@/features/auth/utils/report-status";
import { IContext } from "@/server/graphql/context";
import type { IAccountService } from "@/features/auth/service/account-service";
import { UnauthenticatedError } from "@/shared/errors";
import {
  type IAuthorizationService,
  USER_DELETE_ACTION,
  userResource,
} from "@/server/api/authorization";

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
  constructor(
    private readonly accountService: IAccountService,
    private readonly authorizationService: IAuthorizationService,
  ) {}

  // Deliberately no @Authorized decorator: this nullable field is the
  // dashboard's identity probe, so an anonymous caller must reach the resolver
  // and receive null. The global GraphQL scope middleware still classifies
  // Query.userProfile as a read and enforces ledger.read when a scoped OAuth or
  // API-key identity is present.
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
    const userId = args.userId ?? ctx.getCurrentUserId();
    const currentUserId = ctx.getCurrentUserId();
    if (userId !== currentUserId || !userId) {
      throw new UnauthenticatedError("Not authorized user");
    }
    const user = await this.accountService.getUserProfile(userId);
    return user;
  }

  @Mutation(() => Boolean, {
    description: "delete user account and its associated data",
  })
  public async deleteAccount(@Ctx() ctx: IContext): Promise<boolean> {
    const identity = ctx.getCurrentIdentity();
    await this.authorizationService.authorizeOrThrow({
      principal: identity,
      action: USER_DELETE_ACTION,
      resource: userResource(identity.userId),
    });
    return this.accountService.deleteAccount(identity.userId);
  }

  @Authorized()
  @Query(() => [SearchUser])
  public async getUserByExactMatch(
    @Ctx() ctx: IContext,
    @Args() args: SearchUserInput,
  ): Promise<SearchUser[]> {
    const users = await this.accountService.findUsersByEmailOrUsername(
      args.keyword,
      args.includeCurrentUser ? undefined : ctx.getCurrentUserId(),
    );
    return users.map((u) => ({ email: u.email, username: u.ledger_username }));
  }

  @Authorized()
  @Mutation(() => UserProfileResponse)
  public async updateUsername(
    @Ctx() ctx: IContext,
    @Args() args: UpdateUsernameInput,
  ): Promise<UserProfileResponse | null> {
    await this.accountService.updateUsername(
      ctx.getCurrentUserId(),
      args.username,
    );
    return this.accountService.getUserProfile(ctx.getCurrentUserId());
  }

  @Authorized()
  @Mutation(() => UserProfileResponse, {
    description: "Update user profile (firstName and lastName)",
  })
  public async updateProfile(
    @Ctx() ctx: IContext,
    @Args() args: UpdateProfileInput,
  ): Promise<UserProfileResponse | null> {
    await this.accountService.updateProfile(
      ctx.getCurrentUserId(),
      args.firstName ?? "",
      args.lastName ?? "",
    );
    return this.accountService.getUserProfile(ctx.getCurrentUserId());
  }
}
