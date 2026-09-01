import type { IModels } from "@/foundation/models";
import type { DbExecutor } from "@/drizzle/drizzle";
import type { ISendGrid } from "@/foundation/sendgrid";
import type { IStripeService } from "@/features/stripe/service/stripe-service";
import type { IFavaClientFactory } from "@/foundation/clients/fava-client-factory";
import { type AppConfig } from "@/config/config";
import { z } from "zod";
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  BadUserInputError,
  RateLimitedError,
  ServiceUnavailableError,
} from "@/shared/errors";
import { getBasicAuthHeader } from "@/features/auth/utils/auth";
import { delayRun } from "@/shared/execute";
import { generateLedgerPassword } from "@/features/auth/utils/ledger-password";
import { createLedger } from "@/features/ledger/operations/create-ledger";
import { defaultLedgerTemplate } from "@/features/ledger/utils/ledger-template";
import { logger } from "@/shared/logger";
import { lock, LOCK_KEYS } from "@/shared/lock";
import { checkRateLimit } from "@/shared/rate-limiter";
import { incrementInWindow } from "@/foundation/redis/redis-counter";
import { CACHE_KEYS } from "@/shared/cache";
import { secureStringEqual } from "@/features/auth/utils/secure-string-equal";
import bcrypt from "bcryptjs";
import {
  renderWelcomeHtml,
  renderWelcomeText,
  renderPasswordResetHtml,
  renderPasswordResetText,
  renderSignupOtpHtml,
  renderSignupOtpText,
} from "@/shared/email-templates";
import type { MagicLinkToken } from "@/features/auth/data/magic-link-token-model";
import type { SignupOtpSession } from "@/features/auth/data/signup-otp-session-model";

type RegisterUserParams = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  username?: string | null;
  ip: string;
};

type CreateSignUpSessionParams = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  username?: string | null;
  ip: string;
  withDefaultLedger?: boolean;
  oauthInteractionUid?: string;
};

type FinishSignupSessionParams = {
  sessionId: string;
  otp: string;
};

type LoginUserParams = {
  email: string;
  password: string;
};

type SignInWithOneTimeTokenParams = {
  token: string;
};

type AuthResponse = {
  token: string;
  expireAt: Date;
};

export type DashboardSignupParams = Omit<
  CreateSignUpSessionParams,
  "oauthInteractionUid"
> & {
  oauthInteractionUid: string;
};

/**
 * Credential checks used only while completing the first-party Dashboard OAuth
 * interaction. These methods deliberately return an account id, never a legacy
 * session token.
 */
export interface IDashboardOAuthAuthService {
  authenticateDashboardPassword(params: LoginUserParams): Promise<string>;
  consumeDashboardMagicLink(token: string): Promise<string>;
  startDashboardSignup(
    params: DashboardSignupParams,
  ): Promise<{ sessionId: string; expireAt: string }>;
  finishDashboardSignup(params: {
    oauthInteractionUid: string;
    sessionId: string;
    otp: string;
  }): Promise<string>;
}

const MAX_PASSWORD_LENGTH = 128;
const SIGNUP_OTP_ATTEMPT_WINDOW_MS = 10 * 60 * 1000;
const SIGNUP_OTP_MAX_ATTEMPTS = 5;

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "sharklasers.com",
  "guerrillamailblock.com",
  "grr.la",
  "spam4.me",
  "yopmail.com",
  "yopmail.fr",
  "cool.fr.nf",
  "jetable.fr.nf",
  "nospam.ze.tc",
  "nomail.xl.cx",
  "mega.zik.dj",
  "speed.1s.fr",
  "courriel.fr.nf",
  "moncourrier.fr.nf",
  "monemail.fr.nf",
  "monmail.fr.nf",
  "tempmail.com",
  "temp-mail.org",
  "throwam.com",
  "throwaway.email",
  "trashmail.com",
  "trashmail.me",
  "trashmail.net",
  "dispostable.com",
  "maildrop.cc",
  "10minutemail.com",
  "10minutemail.net",
  "fakeinbox.com",
  "getairmail.com",
  "mailnull.com",
  "spamgourmet.com",
  "spamgourmet.net",
  "spamgourmet.org",
  "spamhole.com",
]);

export interface IAuthService {
  registerUser(params: RegisterUserParams): Promise<AuthResponse>;
  loginUser(params: LoginUserParams): Promise<AuthResponse>;
  signInWithMagicLinkToken(
    params: SignInWithOneTimeTokenParams,
  ): Promise<AuthResponse>;
  refreshToken(userId: string, currentToken: string): Promise<AuthResponse>;
  logout(token: string): Promise<void>;
  createOneTimeToken(userId: string): Promise<MagicLinkToken>;
  sendForgotPasswordLink(email: string, ip?: string): Promise<void>;
  validateEmailToken(token: string): Promise<boolean>;
  resetPassword(token: string, newPassword: string): Promise<void>;
  createSignUpSession(params: CreateSignUpSessionParams): Promise<string>;
  finishSignupSession(params: FinishSignupSessionParams): Promise<AuthResponse>;
  verifySignUpOtp(params: FinishSignupSessionParams): Promise<AuthResponse>;
  getSignupOtpSession(sessionId: string): Promise<SignupOtpSession | null>;
  deleteSignupOtpSession(sessionId: string): Promise<void>;
}

export class AuthService implements IAuthService, IDashboardOAuthAuthService {
  constructor(
    private readonly models: Pick<
      IModels,
      | "user"
      | "jwt"
      | "magicLinkToken"
      | "emailToken"
      | "signupOtpSession"
      | "paidCustomer"
    >,
    private readonly db: DbExecutor,
    private readonly sendgrid: ISendGrid,
    private readonly stripe: IStripeService,
    private readonly favaClientFactory: IFavaClientFactory,
    private readonly config: Pick<AppConfig, "favaApi" | "dashboard" | "gitea">,
  ) {}

  public registerUser = async (
    params: RegisterUserParams,
  ): Promise<AuthResponse> => {
    const userId = await this.registerUserAccount(params);
    return this.models.jwt.create(this.db, userId);
  };

  private registerUserAccount = async (
    params: RegisterUserParams,
  ): Promise<string> => {
    const { email, password, firstName, lastName, username } = params;
    const locale = "en";
    const ledger_username = username ?? email.split("@")[0];
    const ledger_password = generateLedgerPassword();
    const ip = params.ip;

    // Pre-check before transaction (read-only operation)
    const user = await this.models.user.getByMail(this.db, email);
    if (user) {
      throw new ConflictError("User", "Email already exists");
    }

    const favaAdminApiClient = this.favaClientFactory.getAdminClient();
    // Use email-specific lock to prevent concurrent registrations with same email
    const lockKey = LOCK_KEYS.USER.register(email);
    const result = await lock.acquire(lockKey, () => {
      return this.db.transaction(async (tx) => {
        const user = await this.models.user.create(tx, {
          email,
          password,
          locale,
          firstName,
          lastName,
          ip,
          ledger_username,
          ledger_password,
        });
        const userId = user.id;

        try {
          await favaAdminApiClient.admin.createUser(
            {
              username: ledger_username,
              password: ledger_password,
              email,
            },
            {
              headers: getBasicAuthHeader(
                this.config.favaApi.adminUser,
                this.config.favaApi.adminPassword,
              ),
            },
          );
        } catch (error) {
          logger.error("error creating user in fava", { error });
          throw error;
        }

        delayRun<void>(async () => {
          const welcomeParams = {
            firstName,
            dashboardUrl: "https://beancount.io/ledger",
            mobileAppUrl: "http://onelink.to/v3rz2v",
            helpCenterUrl: "https://beancount.io/docs/help-center",
          };
          await this.sendgrid.sendMail({
            to: email,
            subject: "Welcome to Beancount.io!",
            html: renderWelcomeHtml(welcomeParams),
            text: renderWelcomeText(welcomeParams),
          });
        });

        return userId;
      });
    });
    return result;
  };

  public loginUser = async (params: LoginUserParams): Promise<AuthResponse> => {
    const userId = await this.authenticateDashboardPassword(params);
    const { token, expireAt } = await this.models.jwt.create(this.db, userId);
    return { token, expireAt };
  };

  public authenticateDashboardPassword = async (
    params: LoginUserParams,
  ): Promise<string> => {
    const { email, password } = params;
    // Reject overlong passwords before touching the database or bcrypt.
    // Use the same generic error as wrong password to avoid leaking signal.
    if (password.length > MAX_PASSWORD_LENGTH) {
      throw new BadUserInputError("Invalid email or password");
    }
    const user = await this.models.user.getByMail(this.db, email);
    if (!user) {
      // Use same generic error as wrong password to prevent email enumeration
      throw new BadUserInputError("Invalid email or password");
    }
    const isPasswordVerified = await this.models.user.verifyPassword(
      this.db,
      user.id,
      password,
    );
    if (!isPasswordVerified) {
      throw new BadUserInputError("Invalid email or password");
    }
    if (user.isBlocked) {
      throw new ForbiddenError(
        "User is banned. If you need help, please contact https://beancount.io/tg.",
      );
    }
    return user.id;
  };

  public signInWithMagicLinkToken = async (
    params: SignInWithOneTimeTokenParams,
  ): Promise<AuthResponse> => {
    const userId = await this.consumeDashboardMagicLink(params.token);
    const { token, expireAt } = await this.models.jwt.create(this.db, userId);
    return { token, expireAt };
  };

  public consumeDashboardMagicLink = async (token: string): Promise<string> => {
    const oneTimeToken =
      await this.models.magicLinkToken.findOneAndDelete(token);
    if (!oneTimeToken) {
      throw new BadUserInputError("Invalid or expired token");
    }

    const user = await this.models.user.getById(this.db, oneTimeToken.userId);
    if (!user) {
      throw new NotFoundError("User", oneTimeToken.userId);
    }
    if (user.isBlocked) {
      throw new ForbiddenError(
        "User is banned. If you need help, please contact https://beancount.io/tg.",
      );
    }

    return user.id;
  };

  public refreshToken = async (
    userId: string,
    currentToken: string,
  ): Promise<AuthResponse> => {
    const user = await this.models.user.getById(this.db, userId);
    if (!user) {
      throw new NotFoundError("User", userId);
    }
    if (user.isBlocked) {
      throw new ForbiddenError(
        "User is banned. If you need help, please contact https://beancount.io/tg.",
      );
    }

    return this.db.transaction(async (tx) => {
      const { token, expireAt } = await this.models.jwt.create(tx, userId);
      await this.models.jwt.revoke(tx, currentToken);
      return { token, expireAt };
    });
  };

  public logout = async (token: string): Promise<void> => {
    await this.models.jwt.revoke(this.db, token);
  };

  public createOneTimeToken = async (
    userId: string,
  ): Promise<MagicLinkToken> => {
    return this.models.magicLinkToken.regenerateToken(userId);
  };

  public sendForgotPasswordLink = async (
    email: string,
    ip?: string,
  ): Promise<void> => {
    // Rate limit: 2 requests per minute per email
    checkRateLimit(`forgot-password:${email}`, {
      windowMs: 60000,
      max: 2,
      message:
        "Too many password reset requests for this email. Please try again later.",
    });

    // Also rate limit by IP if provided (2 requests per minute per IP)
    if (ip && ip !== "unknown") {
      checkRateLimit(`forgot-password-ip:${ip}`, {
        windowMs: 60000,
        max: 2,
        message: "Too many password reset requests. Please try again later.",
      });
    }

    const user = await this.models.user.getByMail(this.db, email);
    if (!user) {
      // Silent success — do not reveal whether the email is registered (prevents email enumeration)
      return;
    }
    const { token } = await this.models.emailToken.regenerateToken(user.id);
    const link = `${this.config.dashboard.url}/auth/reset-password/?token=${token}`;
    logger.debug(`sending out password reset email ${link}`);

    const resetParams = { resetLink: link };
    await this.sendgrid.sendMail({
      to: email,
      subject: "Reset your Password",
      html: renderPasswordResetHtml(resetParams),
      text: renderPasswordResetText(resetParams),
    });
  };

  public validateEmailToken = async (token: string): Promise<boolean> => {
    const emailToken = await this.models.emailToken.findOne(token);
    if (!emailToken) {
      return false;
    }
    const user = await this.models.user.getById(this.db, emailToken.userId);
    if (!user) {
      return false;
    }
    return true;
  };

  public resetPassword = async (
    token: string,
    newPassword: string,
  ): Promise<void> => {
    const emailToken = await this.models.emailToken.findOne(token);
    if (!emailToken) {
      throw new BadUserInputError("Invalid or expired token");
    }

    if (newPassword.length < 8) {
      throw new BadUserInputError(
        "Please use at least 8 characters as the password",
      );
    }
    if (newPassword.length > MAX_PASSWORD_LENGTH) {
      throw new BadUserInputError(
        `Password must be at most ${MAX_PASSWORD_LENGTH} characters long`,
      );
    }

    const user = await this.models.user.getById(this.db, emailToken.userId);
    if (!user) {
      throw new NotFoundError("User", emailToken.userId);
    }

    // Consume the token FIRST to prevent reuse (security: if password update fails, token is already consumed)
    await this.models.emailToken.findOneAndDelete(token);

    await this.models.user.updatePassword(
      this.db,
      emailToken.userId,
      newPassword,
    );
  };

  public createSignUpSession = async (
    params: CreateSignUpSessionParams,
  ): Promise<string> => {
    const { email, password, firstName, lastName, username, ip } = params;

    const normalizedEmail = email.toLowerCase().trim();
    const [, domainPart] = normalizedEmail.split("@");

    // Gmail dot/plus aliasing (p.an@gmail.com === pan@gmail.com) is
    // intentionally NOT normalized here. Silently rewriting the address to
    // its canonical form breaks login for the address the user actually
    // typed and receives mail at, with no indication anything changed — the
    // admin fix-user-email endpoint exists to manually reconcile mismatches
    // that predate this decision. If canonicalization is enforced again in
    // the future, prefer explicitly rejecting the signup (BadUserInputError
    // asking the user to use their canonical address) over silently
    // rewriting it.
    //
    // Example of the confusion the dot-stripping logic below used to cause:
    //   1. User signs up with "p.an@gmail.com" (this is the address they
    //      type, and where they receive the verification email).
    //   2. The logic below rewrites normalizedEmail to "pan@gmail.com"
    //      before the account is created, so that's what gets stored.
    //   3. The user later tries to log in with "p.an@gmail.com" (the address
    //      they've always used) — getByMail("p.an@gmail.com") finds nothing,
    //      since the stored record is "pan@gmail.com". Login fails, or a
    //      "forgot password" flow silently creates confusion, with no signal
    //      to the user that their email was ever altered.
    //
    // Previous normalization logic, kept for reference:
    //
    // let normalizedEmail = email.toLowerCase().trim();
    // const [localPart, domainPart] = normalizedEmail.split("@");
    // if (domainPart === "gmail.com" || domainPart === "googlemail.com") {
    //   normalizedEmail = `${localPart.replace(/\./g, "")}@${domainPart}`;
    // }

    if (!z.email().safeParse(normalizedEmail).success) {
      throw new BadUserInputError("Email is invalid");
    }

    // Rate limit: 5 signup requests per hour per email
    checkRateLimit(`signup:${normalizedEmail}`, {
      windowMs: 60 * 60 * 1000,
      max: 5,
      message:
        "Too many signup attempts for this email. Please try again later.",
    });

    // Rate limit: 10 signup requests per hour per IP
    if (ip && ip !== "unknown") {
      checkRateLimit(`signup-ip:${ip}`, {
        windowMs: 60 * 60 * 1000,
        max: 10,
        message:
          "Too many signup attempts from your network. Please try again later.",
      });
    }

    // Block disposable / throwaway email domains
    if (domainPart && DISPOSABLE_EMAIL_DOMAINS.has(domainPart)) {
      throw new BadUserInputError(
        "Disposable email addresses are not allowed. Please use a permanent email address.",
      );
    }

    if (password.length < 8) {
      throw new BadUserInputError(
        "Password must be at least 8 characters long",
      );
    }
    if (password.length > MAX_PASSWORD_LENGTH) {
      throw new BadUserInputError(
        `Password must be at most ${MAX_PASSWORD_LENGTH} characters long`,
      );
    }

    if (!firstName || firstName.trim().length === 0) {
      throw new BadUserInputError("First name is required");
    }
    if (!lastName || lastName.trim().length === 0) {
      throw new BadUserInputError("Last name is required");
    }

    const existingUser = await this.models.user.getByMail(
      this.db,
      normalizedEmail,
    );
    if (existingUser) {
      throw new ConflictError("Email", normalizedEmail);
    }
    const usernameToUse = username?.trim() || null;
    if (usernameToUse) {
      const existingUser = await this.models.user.getUserByUsername(
        this.db,
        usernameToUse,
      );
      if (existingUser) {
        throw new ConflictError("Username", usernameToUse);
      }
    }

    // Hash before storing in Redis so plaintext password never leaves the service layer
    const hashedPassword = await bcrypt.hash(password, 10);

    const session = await this.models.signupOtpSession.createSession(
      {
        email: normalizedEmail,
        password: hashedPassword,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: usernameToUse,
        ip,
        withDefaultLedger: params.withDefaultLedger ?? false,
        oauthInteractionUid: params.oauthInteractionUid,
      },
      10, // 10 minutes expiration
    );

    const preSignupParams = { otp: session.otp };
    await this.sendgrid.sendMail({
      to: normalizedEmail,
      subject: "Verify Your Email - Beancount.io",
      html: renderSignupOtpHtml(preSignupParams),
      text: renderSignupOtpText(preSignupParams),
    });

    return session.id;
  };

  public startDashboardSignup = async (
    params: DashboardSignupParams,
  ): Promise<{ sessionId: string; expireAt: string }> => {
    const sessionId = await this.createSignUpSession(params);
    const session = await this.getSignupOtpSession(sessionId);
    if (!session) {
      throw new ServiceUnavailableError("Signup session");
    }
    return { sessionId, expireAt: session.expireAt };
  };

  public finishDashboardSignup = async (params: {
    oauthInteractionUid: string;
    sessionId: string;
    otp: string;
  }): Promise<string> => {
    const session = await this.models.signupOtpSession.getSessionById(
      params.sessionId,
    );
    if (
      !session ||
      !session.oauthInteractionUid ||
      !secureStringEqual(
        session.oauthInteractionUid,
        params.oauthInteractionUid,
      )
    ) {
      throw new BadUserInputError("Invalid or expired session");
    }

    await this.consumeSignupOtpAttempt(session.email);
    if (!secureStringEqual(session.otp, params.otp)) {
      throw new BadUserInputError("Invalid OTP code");
    }

    const userId = await this.registerUserAccount({
      email: session.email,
      password: session.password,
      firstName: session.firstName,
      lastName: session.lastName,
      username: session.username ?? null,
      ip: session.ip,
    });

    if (session.withDefaultLedger) {
      await this.createDefaultLedgerForUser(userId);
    }
    await this.deleteSignupOtpSession(params.sessionId);
    return userId;
  };

  public finishSignupSession = async (
    params: FinishSignupSessionParams,
  ): Promise<AuthResponse> => {
    const { sessionId, otp } = params;

    const session =
      await this.models.signupOtpSession.getSessionById(sessionId);
    if (!session) {
      throw new BadUserInputError("Invalid or expired session");
    }

    await this.consumeSignupOtpAttempt(session.email);

    if (!secureStringEqual(session.otp, otp)) {
      throw new BadUserInputError("Invalid OTP code");
    }

    const result = await this.registerUser({
      email: session.email,
      password: session.password,
      firstName: session.firstName,
      lastName: session.lastName,
      username: session.username ?? null,
      ip: session.ip,
    });

    // Delete session ONLY after successful registration so user can retry on failure
    await this.models.signupOtpSession.deleteSessionById(sessionId);

    return result;
  };

  public getSignupOtpSession = async (
    sessionId: string,
  ): Promise<SignupOtpSession | null> => {
    return this.models.signupOtpSession.getSessionById(sessionId);
  };

  public deleteSignupOtpSession = async (sessionId: string): Promise<void> => {
    await this.models.signupOtpSession.deleteSessionById(sessionId);
  };

  /**
   * Verifies the signup OTP, registers the user, optionally creates a default
   * ledger, and deletes the session. Owns the full signup-completion
   * orchestration that used to live in the resolver (rate limiting, OTP check,
   * cross-service default-ledger creation).
   */
  public verifySignUpOtp = async (
    params: FinishSignupSessionParams,
  ): Promise<AuthResponse> => {
    const { sessionId, otp } = params;

    const session =
      await this.models.signupOtpSession.getSessionById(sessionId);
    if (!session) {
      throw new BadUserInputError("Invalid or expired session");
    }

    await this.consumeSignupOtpAttempt(session.email);

    if (!secureStringEqual(session.otp, otp)) {
      throw new BadUserInputError("Invalid OTP code");
    }

    const result = await this.registerUser({
      email: session.email,
      password: session.password,
      firstName: session.firstName,
      lastName: session.lastName,
      username: session.username ?? null,
      ip: session.ip,
    });

    if (session.withDefaultLedger) {
      await this.createDefaultLedger(result.token);
    }

    // Delete session after successful registration.
    // If registerUser or ledger creation throws, session remains for retry.
    await this.deleteSignupOtpSession(sessionId);

    return result;
  };

  private consumeSignupOtpAttempt = async (email: string): Promise<void> => {
    const attempt = await incrementInWindow(
      CACHE_KEYS.auth.signupOtpAttemptsByEmail(email),
      SIGNUP_OTP_ATTEMPT_WINDOW_MS,
    );

    if (!attempt) {
      throw new ServiceUnavailableError("OTP verification");
    }

    if (attempt.count > SIGNUP_OTP_MAX_ATTEMPTS) {
      throw new RateLimitedError(
        Math.max(1, Math.ceil(attempt.resetInMs / 1000)),
        "Too many OTP attempts. Please request a new verification code.",
      );
    }
  };

  /**
   * Best-effort creation of a default ledger for a freshly registered user.
   * Derives the user id from the issued JWT (no request context needed) and
   * delegates to the shared ledger-creation operation. Failures are logged but
   * never block signup.
   */
  private createDefaultLedger = async (token: string): Promise<void> => {
    try {
      const userId = await this.models.jwt.verify(this.db, token);
      if (!userId) {
        return;
      }
      await this.createDefaultLedgerForUser(userId);
    } catch (error) {
      logger.error("Failed to create default ledger", { error });
    }
  };

  /** Create the default ledger without deriving identity from a credential. */
  private createDefaultLedgerForUser = async (
    userId: string,
  ): Promise<void> => {
    try {
      const { favaApiClient } =
        await this.favaClientFactory.getApiContext(userId);
      await createLedger({
        favaApiClient,
        models: this.models,
        postgresDb: this.db,
        stripe: this.stripe,
        config: this.config,
        ledgerCreate: {
          name: "Default",
          description: "Default ledger for the user",
          private: false,
          files: defaultLedgerTemplate,
        },
        userId,
      });
    } catch (error) {
      logger.error("Failed to create default ledger", { error });
    }
  };
}
