import type { IAccountService } from "@/features/auth/service/account-service";
import type { User } from "@/features/auth/data/user-model";
import {
  AUTHORIZATION_ACTIONS,
  type AuthorizationRequest,
  type IAuthorizationService,
  userResource,
} from "@/server/api/authorization";

export interface IAccountWorkflow {
  getUserProfile(
    request: AuthorizationRequest,
    targetUserId: string,
  ): ReturnType<IAccountService["getUserProfile"]>;
  findUsersByEmailOrUsername(
    request: AuthorizationRequest,
    keyword: string,
    includeCurrentUser: boolean,
  ): Promise<User[]>;
  updateUsername(
    request: AuthorizationRequest,
    username: string,
  ): ReturnType<IAccountService["getUserProfile"]>;
  updateProfile(
    request: AuthorizationRequest,
    firstName: string,
    lastName: string,
  ): ReturnType<IAccountService["getUserProfile"]>;
  deleteAccount(request: AuthorizationRequest): Promise<boolean>;
}

/** One authorization decision followed by the existing account-domain work. */
export class AccountWorkflow implements IAccountWorkflow {
  constructor(
    private readonly account: IAccountService,
    private readonly authorization: IAuthorizationService,
  ) {}

  public async getUserProfile(
    request: AuthorizationRequest,
    targetUserId: string,
  ) {
    await this.authorization.authorizeOrThrow({
      request,
      action: AUTHORIZATION_ACTIONS.USER_PROFILE_READ,
      resource: userResource(targetUserId),
    });
    return this.account.getUserProfile(targetUserId);
  }

  public async findUsersByEmailOrUsername(
    request: AuthorizationRequest,
    keyword: string,
    includeCurrentUser: boolean,
  ): Promise<User[]> {
    const { principal } = request;
    await this.authorization.authorizeOrThrow({
      request,
      action: AUTHORIZATION_ACTIONS.USER_PROFILE_SEARCH,
      resource: userResource(principal.userId),
    });
    return this.account.findUsersByEmailOrUsername(
      keyword,
      includeCurrentUser ? undefined : principal.userId,
    );
  }

  public async updateUsername(request: AuthorizationRequest, username: string) {
    const { principal } = request;
    await this.authorization.authorizeOrThrow({
      request,
      action: AUTHORIZATION_ACTIONS.USER_PROFILE_UPDATE,
      resource: userResource(principal.userId),
    });
    await this.account.updateUsername(principal.userId, username);
    return this.account.getUserProfile(principal.userId);
  }

  public async updateProfile(
    request: AuthorizationRequest,
    firstName: string,
    lastName: string,
  ) {
    const { principal } = request;
    await this.authorization.authorizeOrThrow({
      request,
      action: AUTHORIZATION_ACTIONS.USER_PROFILE_UPDATE,
      resource: userResource(principal.userId),
    });
    await this.account.updateProfile(principal.userId, firstName, lastName);
    return this.account.getUserProfile(principal.userId);
  }

  public async deleteAccount(request: AuthorizationRequest): Promise<boolean> {
    const { principal } = request;
    await this.authorization.authorizeOrThrow({
      request,
      action: AUTHORIZATION_ACTIONS.USER_DELETE,
      resource: userResource(principal.userId),
    });
    return this.account.deleteAccount(principal.userId);
  }
}
