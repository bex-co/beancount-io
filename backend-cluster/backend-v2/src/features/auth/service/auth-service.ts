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
import {
  PasswordPolicyError,
  passwordPolicyViolation,
} from "@/features/auth/utils/password-policy";
import type { IsPwnedPassword } from "@/features/auth/operations/is-pwned-password";
import {
  assertValidUsername,
  usernameFromEmail,
} from "@/features/auth/utils/username-rule";
import { createLedger } from "@/features/ledger/operations/create-ledger";
import { defaultLedgerTemplate } from "@/features/ledger/utils/ledger-template";
import { logger } from "@/shared/logger";
import { lock, LOCK_KEYS } from "@/shared/lock";
import {
  enforceSignupRequestLimits,
  consumeMailDelivery,
  enforceSignupOtpIpLimits,
  enforceSignupOtpAccountLimits,
} from "@/features/auth/operations/auth-mail-limits";
import {
  clearPasswordFailures,
  verifyPasswordWithinBudget,
} from "@/features/auth/operations/password-failure-budget";
import {
  enforcePasswordIpLimits,
  enforcePasswordRequestLimits,
} from "@/features/auth/operations/password-request-limits";
import {
  enforceMailRequestLimits,
  enforceRecoveryProofLimits,
  enforceVerifiedRecoveryAccountLimit,
} from "@/features/auth/operations/auth-mail-limits";
import { consumeSignInRecoveryProof } from "@/features/auth/operations/sign-in-recovery-proof";
import type { IAuthMailService } from "./auth-mail-service";
import { verifyPasswordWithCapacity } from "@/features/auth/utils/password-verifier";
import type { User } from "@/features/auth/data/user-model/types";
import { UNKNOWN_CLIENT_ADDRESS } from "@/server/client-address";
import { secureStringEqual } from "@/features/auth/utils/secure-string-equal";
import { validateAuthReturnPath } from "@/features/auth/utils/auth-return-path";
import bcrypt from "bcryptjs";
import {
  renderWelcomeHtml,
  renderWelcomeText,
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
};

export type FinishSignupSessionParams = {
  sessionId: string;
  otp: string;
  ip?: string;
};

export type LoginUserParams = {
  email: string;
  password: string;
  ip?: string;
};

export type SignInRecoveryParams = {
  email: string;
  challengeId: string;
  code: string;
  password: string;
  ip?: string;
};

export type SignInWithOneTimeTokenParams = {
  token: string;
};

export type AuthResponse = {
  token: string;
  expireAt: Date;
};

/** Sign-in's input cap; new passwords are held to `password-policy.ts`. */
const MAX_LOGIN_PASSWORD_LENGTH = 128;

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
  requestSignInRecovery(
    email: string,
    ip?: string,
    returnTo?: string,
  ): Promise<string>;
  signInWithEmailCode(params: SignInRecoveryParams): Promise<AuthResponse>;
  /**
   * The account an email + password names, held to the account's
   * request limits and wrong-password budget. Every password sign-in goes
   * through it (dashboard, Git basic auth), sharing both budgets. Throws
   * `BadUserInputError` for wrong credentials and `RateLimitedError` for a
   * spent budget.
   */
  verifyPasswordCredentials(
    email: string,
    password: string,
    ip?: string,
  ): Promise<User>;
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

export class AuthService implements IAuthService {
  constructor(
    private readonly models: Pick<
      IModels,
      | "user"
      | "jwt"
      | "oauthGrant"
      | "magicLinkToken"
      | "emailToken"
      | "signupOtpSession"
      | "paidCustomer"
    >,
    private readonly db: DbExecutor,
    private readonly sendgrid: ISendGrid,
    private readonly stripe: IStripeService,
    private readonly favaClientFactory: IFavaClientFactory,
    private readonly config: Pick<
      AppConfig,
      "favaApi" | "dashboard" | "gitea"
    > &
      Partial<Pick<AppConfig, "jwt" | "selfHost">>,
    private readonly isPwnedPassword: IsPwnedPassword,
    private readonly enqueueAuthMail?: IAuthMailService["enqueue"],
  ) {}

  /** The breach lookup goes last, so a locally refused password never leaves. */
  private assertAcceptableNewPassword = async (
    password: string,
    identifiers: readonly (string | null | undefined)[],
  ): Promise<void> => {
    const violation = passwordPolicyViolation(password, identifiers);
    if (violation) throw new PasswordPolicyError(violation);
    if (await this.isPwnedPassword(password)) {
      throw new PasswordPolicyError("BREACHED");
    }
  };

  public registerUser = async (
    params: RegisterUserParams,
  ): Promise<AuthResponse> => {
    const { email, password, firstName, lastName, username } = params;
    const locale = "en";
    if (username) assertValidUsername(username);
    const ledger_username =
      username ||
      (await usernameFromEmail(
        email,
        async (name) =>
          (await this.models.user.getUserByUsername(this.db, name)) !== null,
      ));
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

        const { token, expireAt } = await this.models.jwt.create(tx, userId);

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

        return { token, expireAt };
      });
    });
    return result;
  };

  public verifyPasswordCredentials = async (
    email: string,
    password: string,
    ip = UNKNOWN_CLIENT_ADDRESS,
  ): Promise<User> => {
    email = email.trim().toLowerCase();
    // Count every attempt, including successful and malformed credentials,
    // before any account lookup or expensive comparison work.
    await enforcePasswordRequestLimits(email, ip);
    // Reject overlong passwords before touching the database or bcrypt.
    // Use the same generic error as wrong password to avoid leaking signal.
    if (password.length > MAX_LOGIN_PASSWORD_LENGTH) {
      throw new BadUserInputError("Invalid email or password");
    }
    let user: User | null = null;
    // Per account, across addresses (w0/m7). An unknown account is counted and
    // answered like a wrong password, so neither says whether it exists.
    const verified = await verifyPasswordWithinBudget(email, async () => {
      user = await this.models.user.getByMail(this.db, email);
      const account = user;
      return verifyPasswordWithCapacity(
        password,
        account?.password
          ? () => this.models.user.verifyPassword(this.db, account.id, password)
          : undefined,
      );
    });
    if (!verified || !user) {
      throw new BadUserInputError("Invalid email or password");
    }
    return user;
  };

  public loginUser = async (params: LoginUserParams): Promise<AuthResponse> => {
    const user = await this.verifyPasswordCredentials(
      params.email,
      params.password,
      params.ip,
    );
    return this.issuePasswordSession(user);
  };

  private issuePasswordSession = async (user: User): Promise<AuthResponse> => {
    // Resetting the password locks this same row before revoking sessions.
    // Keep revalidation and issuance together so a delayed old-password proof
    // cannot create a session after that reset has completed.
    return this.db.transaction(async (tx) => {
      const current = await this.models.user.getByIdForUpdate(tx, user.id);
      if (
        !current?.password ||
        !user.password ||
        !secureStringEqual(current.password, user.password)
      ) {
        throw new BadUserInputError("Invalid email or password");
      }
      if (current.isBlocked) {
        throw new ForbiddenError(
          "User is banned. If you need help, please contact https://beancount.io/tg.",
        );
      }
      return this.models.jwt.create(tx, current.id);
    });
  };

  public signInWithMagicLinkToken = async (
    params: SignInWithOneTimeTokenParams,
  ): Promise<AuthResponse> => {
    const { token } = params;

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

    const { token: jwtToken, expireAt } = await this.models.jwt.create(
      this.db,
      user.id,
    );
    return { token: jwtToken, expireAt };
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
    await this.queueRecoveryMail(email, ip, "reset");
  };

  public requestSignInRecovery = async (
    email: string,
    ip?: string,
    returnTo?: string,
  ): Promise<string> => {
    return this.queueRecoveryMail(email, ip, "sign-in-recovery", returnTo);
  };

  private queueRecoveryMail = async (
    email: string,
    ip: string | undefined,
    kind: "reset" | "sign-in-recovery",
    returnTo?: string,
  ): Promise<string> => {
    email = email.trim().toLowerCase();
    await enforceMailRequestLimits(email, ip ?? UNKNOWN_CLIENT_ADDRESS);
    if (!z.email().max(254).safeParse(email).success)
      throw new BadUserInputError("Email is invalid");
    const next = validateAuthReturnPath(returnTo);
    if (!this.enqueueAuthMail)
      throw new ServiceUnavailableError("Email delivery", 5);
    // Durable enqueue is identical for registered and unknown addresses. The
    // worker owns account lookup, delivery suppression and provider retries.
    return next === undefined
      ? this.enqueueAuthMail(email, kind)
      : this.enqueueAuthMail(email, kind, next);
  };

  public signInWithEmailCode = async (
    params: SignInRecoveryParams,
  ): Promise<AuthResponse> => {
    const email = params.email.trim().toLowerCase();
    const ip = params.ip ?? UNKNOWN_CLIENT_ADDRESS;
    await enforcePasswordIpLimits(ip);
    await enforceRecoveryProofLimits(params.challengeId, ip);
    const invalid = () =>
      new BadUserInputError("Invalid email, verification code or password");
    if (
      params.password.length > MAX_LOGIN_PASSWORD_LENGTH ||
      params.challengeId.length > 128 ||
      !/^\d{6}$/.test(params.code)
    )
      throw invalid();
    // Spend before bcrypt: each ownership proof authorizes exactly one password
    // attempt, including a wrong password. It never resets request-volume keys.
    const userId = await consumeSignInRecoveryProof(
      email,
      params.challengeId,
      params.code,
      this.config.jwt?.secret ?? "",
    );
    if (!userId) throw invalid();
    await enforceVerifiedRecoveryAccountLimit(email);
    const user = await this.models.user.getByMail(this.db, email);
    const verified = await verifyPasswordWithCapacity(
      params.password,
      user?.id === userId && user.password
        ? () =>
            this.models.user.verifyPassword(this.db, user.id, params.password)
        : undefined,
    );
    if (!verified || !user || user.id !== userId) throw invalid();
    const session = await this.issuePasswordSession(user);
    await clearPasswordFailures(email);
    return session;
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

    const user = await this.models.user.getById(this.db, emailToken.userId);
    if (!user) {
      throw new NotFoundError("User", emailToken.userId);
    }
    // Before the token is spent, so a refused password can be retried.
    await this.assertAcceptableNewPassword(newPassword, [
      user.email,
      user.ledger_username,
    ]);

    // Consume the token FIRST to prevent reuse (security: if password update fails, token is already consumed)
    const consumed = await this.models.emailToken.findOneAndDelete(token);
    if (!consumed || consumed.userId !== emailToken.userId) {
      throw new BadUserInputError("Invalid or expired token");
    }

    // A reset ends every session and OAuth grant the old password issued, this
    // browser's included: the user may be resetting because someone else holds
    // one. All or nothing, so a reset never reports success with a grant left.
    await this.db.transaction(async (tx) => {
      await this.models.user.updatePassword(tx, emailToken.userId, newPassword);
      await this.models.jwt.deleteByUserId(tx, emailToken.userId);
      await this.models.oauthGrant.revokeAllForUser(tx, emailToken.userId);
      // Other delivered links must not survive a completed password change.
      // Failure aborts the password/session transaction; a fresh link can retry.
      await this.models.emailToken.deleteByUserId(emailToken.userId);
    });
    // Whoever reset the password holds the account's email; let them sign in.
    await clearPasswordFailures(user.email);
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

    await enforceSignupRequestLimits(normalizedEmail, ip);

    // Block disposable / throwaway email domains
    if (domainPart && DISPOSABLE_EMAIL_DOMAINS.has(domainPart)) {
      throw new BadUserInputError(
        "Disposable email addresses are not allowed. Please use a permanent email address.",
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
      // Sign-up's own rule, which only the dashboard form used to check
      // (w0/046); renames are held to it too (w0/036).
      assertValidUsername(usernameToUse);
      const existingUser = await this.models.user.getUserByUsername(
        this.db,
        usernameToUse,
      );
      if (existingUser) {
        throw new ConflictError("Username", usernameToUse);
      }
    }

    // After the cheap checks, so a sign-up refused for them never looks it up.
    await this.assertAcceptableNewPassword(password, [
      normalizedEmail,
      usernameToUse,
    ]);

    // A suppressed resend must leave the existing code and its chosen signup
    // credentials intact. Returning that session for a new submission could
    // bind its verification to a different person's password or profile.
    if (!(await consumeMailDelivery(normalizedEmail))) {
      throw new RateLimitedError(
        60,
        "Please wait before requesting another verification email.",
      );
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
      },
      10, // 10 minutes expiration
    );

    // Self-hosted: nobody is sent a code, because the sign-up resolver
    // finishes the session itself (see `signUp`), so the address is not
    // verified. Never log the session id: it completes the sign-up.
    if (this.config.selfHost) return session.id;

    const preSignupParams = { otp: session.otp };
    await this.sendgrid.sendMail({
      to: normalizedEmail,
      subject: "Verify Your Email - Beancount.io",
      html: renderSignupOtpHtml(preSignupParams),
      text: renderSignupOtpText(preSignupParams),
    });

    return session.id;
  };

  public finishSignupSession = async (
    params: FinishSignupSessionParams,
  ): Promise<AuthResponse> => {
    const { sessionId, otp } = params;
    await enforceSignupOtpIpLimits(params.ip || UNKNOWN_CLIENT_ADDRESS);

    const session =
      await this.models.signupOtpSession.getSessionById(sessionId);
    if (!session) {
      throw new BadUserInputError("Invalid or expired session");
    }

    await enforceSignupOtpAccountLimits(session.email, sessionId);

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
    await enforceSignupOtpIpLimits(params.ip || UNKNOWN_CLIENT_ADDRESS);

    const session =
      await this.models.signupOtpSession.getSessionById(sessionId);
    if (!session) {
      throw new BadUserInputError("Invalid or expired session");
    }

    await enforceSignupOtpAccountLimits(session.email, sessionId);

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

  /**
   * Best-effort creation of a default ledger for a freshly registered user.
   * Derives the user id from the issued JWT (no request context needed) and
   * delegates to the shared ledger-creation operation. Failures are logged but
   * never block signup.
   */
  private createDefaultLedger = async (token: string): Promise<void> => {
    try {
      const session = await this.models.jwt.verify(this.db, token);
      if (!session) {
        return;
      }
      const { userId } = session;
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
          private: true,
          files: defaultLedgerTemplate,
        },
        userId,
      });
    } catch (error) {
      logger.error("Failed to create default ledger", { error });
    }
  };
}
