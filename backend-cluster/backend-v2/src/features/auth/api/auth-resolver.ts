import {
  Args,
  ArgsType,
  Ctx,
  Field,
  Mutation,
  ObjectType,
  Query,
} from "type-graphql";
import { AllowAnonymous, Authenticated } from "@/server/graphql/authenticated";
import { IsOptional, Matches, MaxLength } from "class-validator";
import { IContext } from "@/server/graphql/context";
import type { IAuthService } from "@/features/auth/service/auth-service";
import type { IAuthSessionWorkflow } from "@/features/auth/workflow/auth-session-workflow";
import { UnauthenticatedError } from "@/shared/errors";
import { setAuthCookie, clearAuthCookie } from "@/shared/cookie-utils";
import { Context } from "koa";

@ObjectType()
class TokenAuthResponse {
  @Field(() => String)
  public token: string;

  @Field(() => Date)
  public expireAt: Date;
}

@ArgsType()
class SignInInput {
  @Field(() => String)
  public email: string;

  @Field(() => String)
  @MaxLength(128, {
    message: "Password must be at most 128 characters long",
  })
  public password: string;
}

@ArgsType()
class RequestSignInRecoveryInput {
  @Field(() => String)
  public email: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @MaxLength(2048)
  public returnTo?: string | null;
}

@ObjectType()
class RequestSignInRecoveryResponse {
  @Field(() => Boolean)
  public success: boolean;
}

@ArgsType()
class SignInWithEmailCodeInput {
  @Field(() => String)
  public email: string;

  @Field(() => String)
  @MaxLength(128)
  public challengeId: string;

  @Field(() => String)
  @Matches(/^\d{6}$/, { message: "Verification code must be a 6-digit code" })
  public code: string;

  @Field(() => String)
  @MaxLength(128, {
    message: "Password must be at most 128 characters long",
  })
  public password: string;
}

@ArgsType()
class SignInWithOneTimeTokenInput {
  @Field(() => String)
  public token: string;
}

@ObjectType()
class CreateOneTimeTokenResponse {
  @Field(() => String)
  public id: string;

  @Field(() => String)
  public expireAt: string;
}

@ObjectType()
class LogoutResponse {
  @Field(() => Boolean)
  public success: boolean;
}

@ArgsType()
class SendForgotPasswordLinkInput {
  @Field(() => String)
  public email: string;
}

@ObjectType()
class SendForgotPasswordLinkResponse {
  @Field(() => Boolean)
  public success: boolean;
}

@ArgsType()
class ResetPasswordInput {
  @Field(() => String)
  public token: string;

  @Field(() => String)
  @MaxLength(128, {
    message: "Password must be at most 128 characters long",
  })
  public newPassword: string;
}

@ObjectType()
class ResetPasswordResponse {
  @Field(() => Boolean)
  public success: boolean;
}

@ArgsType()
class ValidateEmailTokenInput {
  @Field(() => String)
  public token: string;
}

@ObjectType()
class ValidateEmailTokenResponse {
  @Field(() => Boolean)
  public isValid: boolean;
}

@ArgsType()
class SignUpInput {
  @Field(() => String)
  public email: string;

  @Field(() => String)
  @MaxLength(128, {
    message: "Password must be at most 128 characters long",
  })
  public password: string;

  @Field(() => String)
  public firstName: string;

  @Field(() => String)
  public lastName: string;

  @Field(() => String, { nullable: true })
  public username?: string | null;

  @Field(() => String, { nullable: true })
  public inviteSrc?: string | null;

  @Field(() => String, { nullable: true })
  public inviteBy?: string | null;

  @Field(() => Boolean, { nullable: true })
  public withDefaultLedger?: boolean | null;
}

@ObjectType()
class SignUpResponse {
  @Field(() => String)
  public sessionId: string;

  @Field(() => String)
  public expireAt: string;

  @Field(() => String, {
    nullable: true,
    description:
      "Set only on a self-hosted deployment, where sign-up needs no email verification: the account already exists and this is its session token (also set as the auth cookie). Absent means the code in the email must be verified with verifySignUpOtp.",
  })
  public token?: string | null;

  @Field(() => Date, { nullable: true })
  public tokenExpireAt?: Date | null;
}

@ArgsType()
class VerifySignUpOtpInput {
  @Field(() => String)
  public sessionId: string;

  @Field(() => String)
  @Matches(/^\d{4}$/, { message: "OTP must be a 4-digit code" })
  public otp: string;
}

export class AuthResolver {
  constructor(
    private readonly authService: IAuthService,
    private readonly authSessionWorkflow: IAuthSessionWorkflow,
  ) {}

  @Authenticated()
  @Mutation(() => LogoutResponse, {
    description: "Logout user, revoke JWT token and clear httpOnly cookie",
  })
  public async logout(@Ctx() ctx: IContext): Promise<LogoutResponse> {
    if (ctx.token) {
      await this.authService.logout(ctx.token);
    }
    clearAuthCookie(ctx.koaCtx as any);
    return { success: true };
  }

  @AllowAnonymous()
  @Mutation(() => TokenAuthResponse)
  public async signIn(
    @Ctx() ctx: IContext,
    @Args() args: SignInInput,
  ): Promise<TokenAuthResponse> {
    const result = await this.authSessionWorkflow.loginUser({
      email: args.email.toLowerCase().trim(),
      password: args.password,
      ip: ctx.clientIp,
    });
    setAuthCookie(
      ctx.koaCtx as unknown as Context,
      result.token,
      result.expireAt,
      ctx.config.env === "production",
    );
    return { token: result.token, expireAt: result.expireAt };
  }

  @AllowAnonymous()
  @Mutation(() => RequestSignInRecoveryResponse, {
    description: "Request an email ownership code to continue password sign-in",
  })
  public async requestSignInRecovery(
    @Ctx() ctx: IContext,
    @Args() args: RequestSignInRecoveryInput,
  ): Promise<RequestSignInRecoveryResponse> {
    await this.authService.requestSignInRecovery(
      args.email.toLowerCase().trim(),
      ctx.clientIp,
      args.returnTo ?? undefined,
    );
    return { success: true };
  }

  @AllowAnonymous()
  @Mutation(() => TokenAuthResponse, {
    description:
      "Sign in with a one-use email ownership code and the correct password",
  })
  public async signInWithEmailCode(
    @Ctx() ctx: IContext,
    @Args() args: SignInWithEmailCodeInput,
  ): Promise<TokenAuthResponse> {
    const result = await this.authSessionWorkflow.signInWithEmailCode({
      email: args.email.toLowerCase().trim(),
      challengeId: args.challengeId,
      code: args.code,
      password: args.password,
      ip: ctx.clientIp,
    });
    setAuthCookie(
      ctx.koaCtx as unknown as Context,
      result.token,
      result.expireAt,
      ctx.config.env === "production",
    );
    return { token: result.token, expireAt: result.expireAt };
  }

  @Authenticated()
  @Mutation(() => TokenAuthResponse, {
    description:
      "Refresh authentication token - issues a new token and revokes the current one",
  })
  public async refreshToken(@Ctx() ctx: IContext): Promise<TokenAuthResponse> {
    if (!ctx.token) {
      throw new UnauthenticatedError("No token provided");
    }
    const result = await this.authService.refreshToken(
      ctx.getCurrentUserId(),
      ctx.token,
    );
    setAuthCookie(
      ctx.koaCtx as unknown as Context,
      result.token,
      result.expireAt,
      ctx.config.env === "production",
    );
    return { token: result.token, expireAt: result.expireAt };
  }

  @AllowAnonymous()
  @Mutation(() => TokenAuthResponse)
  public async signInWithOneTimeToken(
    @Ctx() ctx: IContext,
    @Args() args: SignInWithOneTimeTokenInput,
  ): Promise<TokenAuthResponse> {
    const result = await this.authSessionWorkflow.signInWithMagicLinkToken({
      token: args.token,
    });
    setAuthCookie(
      ctx.koaCtx as unknown as Context,
      result.token,
      result.expireAt,
      ctx.config.env === "production",
    );
    return { token: result.token, expireAt: result.expireAt };
  }

  @Authenticated()
  @Mutation(() => CreateOneTimeTokenResponse)
  public async createOneTimeToken(
    @Ctx() ctx: IContext,
  ): Promise<CreateOneTimeTokenResponse> {
    const result = await this.authService.createOneTimeToken(
      ctx.getCurrentUserId(),
    );
    return { id: result.id, expireAt: result.expireAt };
  }

  @AllowAnonymous()
  @Mutation(() => SendForgotPasswordLinkResponse, {
    description: "Send a password reset link to the user's email",
  })
  public async sendForgotPasswordLink(
    @Ctx() ctx: IContext,
    @Args() args: SendForgotPasswordLinkInput,
  ): Promise<SendForgotPasswordLinkResponse> {
    await this.authService.sendForgotPasswordLink(
      args.email.toLowerCase().trim(),
      ctx.clientIp,
    );
    return { success: true };
  }

  @AllowAnonymous()
  @Mutation(() => ResetPasswordResponse, {
    description:
      "Reset user password using a token from the password reset email",
  })
  public async resetPassword(
    @Ctx() _ctx: IContext,
    @Args() args: ResetPasswordInput,
  ): Promise<ResetPasswordResponse> {
    await this.authService.resetPassword(args.token, args.newPassword);
    return { success: true };
  }

  @AllowAnonymous()
  @Query(() => ValidateEmailTokenResponse, {
    description: "Validate whether an email token is valid and not expired",
  })
  public async validateEmailToken(
    @Ctx() _ctx: IContext,
    @Args() args: ValidateEmailTokenInput,
  ): Promise<ValidateEmailTokenResponse> {
    const isValid = await this.authService.validateEmailToken(args.token);
    return { isValid };
  }

  @AllowAnonymous()
  @Mutation(() => SignUpResponse, {
    description:
      "Start signup by creating an OTP session. Sends a verification code to the user's email.",
  })
  public async signUp(
    @Ctx() ctx: IContext,
    @Args() args: SignUpInput,
  ): Promise<SignUpResponse> {
    // inviteSrc and inviteBy are accepted for backward compatibility but no longer used
    const sessionId = await this.authService.createSignUpSession({
      email: args.email.toLowerCase().trim(),
      password: args.password,
      firstName: args.firstName,
      lastName: args.lastName,
      username: args.username ?? null,
      ip: ctx.clientIp,
      withDefaultLedger: args.withDefaultLedger ?? false,
    });
    const session = await this.authService.getSignupOtpSession(sessionId);
    if (!session) {
      throw new Error("Failed to retrieve session after creation");
    }
    if (ctx.config.selfHost) {
      // No mail was sent and no verification page exists: finish the sign-up
      // here with the session's own code, through the same checked path.
      const result = await this.authSessionWorkflow.verifySignUpOtp({
        sessionId,
        otp: session.otp,
        ip: ctx.clientIp,
      });
      setAuthCookie(
        ctx.koaCtx as unknown as Context,
        result.token,
        result.expireAt,
        ctx.config.env === "production",
      );
      return {
        sessionId,
        expireAt: session.expireAt,
        token: result.token,
        tokenExpireAt: result.expireAt,
      };
    }
    return { sessionId, expireAt: session.expireAt };
  }

  @AllowAnonymous()
  @Mutation(() => TokenAuthResponse, {
    description: "Verify OTP and create user account to complete signup",
  })
  public async verifySignUpOtp(
    @Ctx() ctx: IContext,
    @Args() args: VerifySignUpOtpInput,
  ): Promise<TokenAuthResponse> {
    const result = await this.authSessionWorkflow.verifySignUpOtp({
      sessionId: args.sessionId,
      otp: args.otp,
      ip: ctx.clientIp,
    });
    setAuthCookie(
      ctx.koaCtx as unknown as Context,
      result.token,
      result.expireAt,
      ctx.config.env === "production",
    );
    return { token: result.token, expireAt: result.expireAt };
  }
}
