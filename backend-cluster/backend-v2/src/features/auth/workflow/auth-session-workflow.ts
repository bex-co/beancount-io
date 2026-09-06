import type { DbExecutor } from "@/drizzle/drizzle";
import type { IModels } from "@/foundation/models";
import type {
  AuthResponse,
  FinishSignupSessionParams,
  IAuthService,
  LoginUserParams,
  SignInWithOneTimeTokenParams,
} from "@/features/auth/service/auth-service";
import type { IUserProfileService } from "@/features/gitea/user-profile/service/user-profile-service";
import { resolveSessionIdentity } from "@/server/api/identity";
import { logger } from "@/shared/logger";

const moduleLogger = logger.child({ module: "auth-session-workflow" });
const OPEN_LEDGER_USERNAME = "open_ledger";

export interface IAuthSessionWorkflow {
  loginUser(params: LoginUserParams): Promise<AuthResponse>;
  signInWithMagicLinkToken(
    params: SignInWithOneTimeTokenParams,
  ): Promise<AuthResponse>;
  verifySignUpOtp(params: FinishSignupSessionParams): Promise<AuthResponse>;
}

/** Complete authentication before applying the default community follow. */
export class AuthSessionWorkflow implements IAuthSessionWorkflow {
  constructor(
    private readonly authService: Pick<
      IAuthService,
      "loginUser" | "signInWithMagicLinkToken" | "verifySignUpOtp"
    >,
    private readonly userProfileService: Pick<
      IUserProfileService,
      "ensureFollowing"
    >,
    private readonly models: Pick<IModels, "jwt">,
    private readonly db: DbExecutor,
  ) {}

  async loginUser(params: LoginUserParams): Promise<AuthResponse> {
    const result = await this.authService.loginUser(params);
    await this.followOpenLedger(result.token);
    return result;
  }

  async signInWithMagicLinkToken(
    params: SignInWithOneTimeTokenParams,
  ): Promise<AuthResponse> {
    const result = await this.authService.signInWithMagicLinkToken(params);
    await this.followOpenLedger(result.token);
    return result;
  }

  async verifySignUpOtp(
    params: FinishSignupSessionParams,
  ): Promise<AuthResponse> {
    const result = await this.authService.verifySignUpOtp(params);
    await this.followOpenLedger(result.token);
    return result;
  }

  private async followOpenLedger(token: string): Promise<void> {
    try {
      // These anonymous auth ceremonies just issued a real session. Resolve
      // that credential through the shared seam before using social permissions.
      const identity = await resolveSessionIdentity(token, {
        models: this.models,
        db: this.db,
      });
      if (!identity) return;

      await this.userProfileService.ensureFollowing(
        OPEN_LEDGER_USERNAME,
        identity,
      );
    } catch (error) {
      // Following is best effort; a later sign-in retries it. Never log the
      // upstream response or request, which may include user credentials.
      moduleLogger.warn("Unable to follow open_ledger after authentication", {
        errorType: error instanceof Error ? error.name : "UpstreamResponse",
      });
    }
  }
}
