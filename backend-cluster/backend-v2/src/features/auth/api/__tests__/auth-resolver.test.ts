import "reflect-metadata";
import { AuthResolver } from "../auth-resolver";
import { IContext } from "@/server/graphql/context";
import type { IAuthService } from "@/features/auth/service/auth-service";
import type { IAuthSessionWorkflow } from "@/features/auth/workflow/auth-session-workflow";
import {
  UnauthenticatedError,
  BadUserInputError,
  RateLimitedError,
  ServiceUnavailableError,
} from "@/shared/errors";
import type { SignupOtpSession } from "@/features/auth/data/signup-otp-session-model";

describe("AuthResolver", () => {
  let resolver: AuthResolver;
  let mockContext: IContext;
  let mockAuthService: jest.Mocked<IAuthService>;
  let mockAuthSessionWorkflow: jest.Mocked<IAuthSessionWorkflow>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockContext = {
      userId: "user-123",
      token: "mock-token",
      reqHeaders: {},
      clientIp: "127.0.0.1",
      config: { env: "development" },
      koaCtx: {
        cookies: {
          set: jest.fn(),
          get: jest.fn(),
        },
        URL: new URL("http://localhost:4104"),
      } as any,
      getCurrentUserId: jest.fn().mockReturnValue("user-123"),
    } as unknown as IContext;

    mockAuthService = {
      registerUser: jest.fn(),
      loginUser: jest.fn(),
      requestSignInRecovery: jest.fn(),
      signInWithEmailCode: jest.fn(),
      signInWithMagicLinkToken: jest.fn(),
      refreshToken: jest.fn(),
      logout: jest.fn(),
      createOneTimeToken: jest.fn(),
      sendForgotPasswordLink: jest.fn(),
      validateEmailToken: jest.fn(),
      resetPassword: jest.fn(),
      createSignUpSession: jest.fn(),
      finishSignupSession: jest.fn(),
      verifySignUpOtp: jest.fn(),
      getSignupOtpSession: jest.fn(),
      deleteSignupOtpSession: jest.fn(),
    } as unknown as jest.Mocked<IAuthService>;

    mockAuthSessionWorkflow = {
      loginUser: jest.fn(),
      signInWithEmailCode: jest.fn(),
      signInWithMagicLinkToken: jest.fn(),
      verifySignUpOtp: jest.fn(),
    };

    resolver = new AuthResolver(mockAuthService, mockAuthSessionWorkflow);
  });

  describe("logout", () => {
    beforeEach(() => {
      mockAuthService.logout.mockResolvedValue(undefined);
    });

    it("should revoke token and clear cookie when token exists", async () => {
      const result = await resolver.logout(mockContext);

      expect(result).toEqual({ success: true });
      expect(mockAuthService.logout).toHaveBeenCalledWith("mock-token");
      expect((mockContext.koaCtx as any).cookies.set).toHaveBeenCalledWith(
        "authSess:beancount.io",
        "",
        { maxAge: 0 },
      );
    });

    it("should clear cookie even when no token in context", async () => {
      mockContext.token = undefined;

      const result = await resolver.logout(mockContext);

      expect(result).toEqual({ success: true });
      expect(mockAuthService.logout).not.toHaveBeenCalled();
      expect((mockContext.koaCtx as any).cookies.set).toHaveBeenCalledWith(
        "authSess:beancount.io",
        "",
        { maxAge: 0 },
      );
    });

    it("should propagate error if token revocation fails", async () => {
      mockAuthService.logout.mockRejectedValue(new Error("Database error"));

      await expect(resolver.logout(mockContext)).rejects.toThrow(
        "Database error",
      );
    });
  });

  describe("signIn", () => {
    it("should sign in user with valid credentials", async () => {
      const args = { email: "user@example.com", password: "password123" };
      const mockResponse = { token: "auth-token", expireAt: new Date() };

      mockAuthSessionWorkflow.loginUser.mockResolvedValue(mockResponse);

      const result = await resolver.signIn(mockContext, args);

      expect(result).toEqual(mockResponse);
      expect(mockAuthSessionWorkflow.loginUser).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "password123",
        ip: "127.0.0.1",
      });
    });

    it("should convert email to lowercase and trim whitespace", async () => {
      const args = { email: "  USER@EXAMPLE.COM  ", password: "password123" };
      const mockResponse = { token: "auth-token", expireAt: new Date() };

      mockAuthSessionWorkflow.loginUser.mockResolvedValue(mockResponse);

      await resolver.signIn(mockContext, args);

      expect(mockAuthSessionWorkflow.loginUser).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "password123",
        ip: "127.0.0.1",
      });
    });

    it("should propagate error when loginUser fails", async () => {
      const args = { email: "user@example.com", password: "wrongpassword" };

      mockAuthSessionWorkflow.loginUser.mockRejectedValue(
        new BadUserInputError("Invalid email or password"),
      );

      await expect(resolver.signIn(mockContext, args)).rejects.toThrow(
        BadUserInputError,
      );
    });
  });

  describe("requestSignInRecovery", () => {
    it("acknowledges delivery without exposing the public receipt as a challenge", async () => {
      mockAuthService.requestSignInRecovery.mockResolvedValue(
        "aem_public_receipt",
      );
      mockContext.reqHeaders = {
        "x-forwarded-for": "203.0.113.1",
        "x-real-ip": "192.0.2.1",
      };

      const result = await resolver.requestSignInRecovery(mockContext, {
        email: " PERSON@EXAMPLE.COM ",
        returnTo: "/ledger/person/books?view=journal#entry",
      });

      expect(result).toEqual({ success: true });
      expect(mockAuthService.requestSignInRecovery).toHaveBeenCalledWith(
        "person@example.com",
        "127.0.0.1",
        "/ledger/person/books?view=journal#entry",
      );
      expect((mockContext.koaCtx as any).cookies.set).not.toHaveBeenCalled();
    });

    it("accepts an omitted continuation without inventing a destination", async () => {
      mockAuthService.requestSignInRecovery.mockResolvedValue(
        "aem_public_receipt",
      );

      await resolver.requestSignInRecovery(mockContext, {
        email: "person@example.com",
      });

      expect(mockAuthService.requestSignInRecovery).toHaveBeenCalledWith(
        "person@example.com",
        "127.0.0.1",
        undefined,
      );
    });

    it.each([
      new RateLimitedError(60),
      new ServiceUnavailableError("Authentication mail", 5),
    ])("preserves admission and queue errors", async (error) => {
      mockAuthService.requestSignInRecovery.mockRejectedValue(error);

      await expect(
        resolver.requestSignInRecovery(mockContext, {
          email: "person@example.com",
        }),
      ).rejects.toBe(error);
      expect((mockContext.koaCtx as any).cookies.set).not.toHaveBeenCalled();
    });
  });

  describe("signInWithEmailCode", () => {
    it("normalizes the email, preserves the code and password, and issues a secure session cookie", async () => {
      mockContext.config.env = "production";
      (mockContext.koaCtx as any).URL = new URL("https://api.beancount.io");
      mockContext.reqHeaders = { "x-forwarded-for": "203.0.113.1" };
      const response = {
        token: "issued-session",
        expireAt: new Date("2030-01-01"),
      };
      mockAuthSessionWorkflow.signInWithEmailCode.mockResolvedValue(response);

      const result = await resolver.signInWithEmailCode(mockContext, {
        email: " PERSON@EXAMPLE.COM ",
        challengeId: "rcv_mail_only_challenge",
        code: "001234",
        password: " unchanged password ",
      });

      expect(result).toEqual(response);
      expect(mockAuthSessionWorkflow.signInWithEmailCode).toHaveBeenCalledWith({
        email: "person@example.com",
        challengeId: "rcv_mail_only_challenge",
        code: "001234",
        password: " unchanged password ",
        ip: "127.0.0.1",
      });
      expect((mockContext.koaCtx as any).cookies.set).toHaveBeenCalledWith(
        "authSess:beancount.io",
        response.token,
        expect.objectContaining({
          httpOnly: true,
          secure: true,
          domain: ".beancount.io",
          maxAge: expect.any(Number),
        }),
      );
      expect(mockAuthService.signInWithEmailCode).not.toHaveBeenCalled();
    });

    it("does not set a cookie when ownership or password verification fails", async () => {
      const error = new BadUserInputError(
        "Invalid email, verification code or password",
      );
      mockAuthSessionWorkflow.signInWithEmailCode.mockRejectedValue(error);

      await expect(
        resolver.signInWithEmailCode(mockContext, {
          email: "person@example.com",
          challengeId: "rcv_mail_only_challenge",
          code: "000000",
          password: "wrong",
        }),
      ).rejects.toBe(error);
      expect((mockContext.koaCtx as any).cookies.set).not.toHaveBeenCalled();
    });
  });

  describe("refreshToken", () => {
    it("should refresh token for authenticated user", async () => {
      const mockResponse = { token: "new-token", expireAt: new Date() };

      mockAuthService.refreshToken.mockResolvedValue(mockResponse);

      const result = await resolver.refreshToken(mockContext);

      expect(result).toEqual(mockResponse);
      expect(mockAuthService.refreshToken).toHaveBeenCalledWith(
        "user-123",
        "mock-token",
      );
    });

    it("should throw error if no token in context", async () => {
      mockContext.token = undefined;

      await expect(resolver.refreshToken(mockContext)).rejects.toThrow(
        UnauthenticatedError,
      );
      await expect(resolver.refreshToken(mockContext)).rejects.toThrow(
        "No token provided",
      );
    });
  });

  describe("signInWithOneTimeToken", () => {
    it("should sign in with valid one-time token", async () => {
      const args = { token: "one-time-token-123" };
      const mockResponse = { token: "auth-token", expireAt: new Date() };

      mockAuthSessionWorkflow.signInWithMagicLinkToken.mockResolvedValue(
        mockResponse,
      );

      const result = await resolver.signInWithOneTimeToken(mockContext, args);

      expect(result).toEqual(mockResponse);
      expect(
        mockAuthSessionWorkflow.signInWithMagicLinkToken,
      ).toHaveBeenCalledWith({
        token: "one-time-token-123",
      });
      expect((mockContext.koaCtx as any).cookies.set).toHaveBeenCalledWith(
        "authSess:beancount.io",
        "auth-token",
        expect.objectContaining({ httpOnly: true, sameSite: "lax" }),
      );
    });
  });

  describe("createOneTimeToken", () => {
    it("should create one-time token for authenticated user", async () => {
      const mockToken = {
        id: "token-id-123",
        userId: "user-123",
        expireAt: new Date().toISOString(),
      };

      mockAuthService.createOneTimeToken.mockResolvedValue(mockToken as never);

      const result = await resolver.createOneTimeToken(mockContext);

      expect(result).toEqual({
        id: "token-id-123",
        expireAt: mockToken.expireAt,
      });
      expect(mockAuthService.createOneTimeToken).toHaveBeenCalledWith(
        "user-123",
      );
    });
  });

  describe("sendForgotPasswordLink", () => {
    it("should send forgot password link with email", async () => {
      const args = { email: "user@example.com" };

      mockAuthService.sendForgotPasswordLink.mockResolvedValue(undefined);

      const result = await resolver.sendForgotPasswordLink(mockContext, args);

      expect(result).toEqual({ success: true });
      expect(mockAuthService.sendForgotPasswordLink).toHaveBeenCalledWith(
        "user@example.com",
        "127.0.0.1",
      );
    });

    it("should convert email to lowercase and trim whitespace", async () => {
      const args = { email: "  USER@EXAMPLE.COM  " };

      mockAuthService.sendForgotPasswordLink.mockResolvedValue(undefined);

      await resolver.sendForgotPasswordLink(mockContext, args);

      expect(mockAuthService.sendForgotPasswordLink).toHaveBeenCalledWith(
        "user@example.com",
        "127.0.0.1",
      );
    });

    // The rate-limit key is the address the trusted proxy saw (w0/m7). A
    // forwarded entry the client wrote itself, or x-real-ip, must not change it.
    it("ignores client-written forwarding headers", async () => {
      mockContext.reqHeaders = {
        "x-forwarded-for": "203.0.113.1, 198.51.100.178",
        "x-real-ip": "192.0.2.1",
      };
      mockAuthService.sendForgotPasswordLink.mockResolvedValue(undefined);

      await resolver.sendForgotPasswordLink(mockContext, {
        email: "user@example.com",
      });

      expect(mockAuthService.sendForgotPasswordLink).toHaveBeenCalledWith(
        "user@example.com",
        "127.0.0.1",
      );
    });

    it("should use 'unknown' when no client address is known", async () => {
      mockContext.clientIp = "unknown";
      mockAuthService.sendForgotPasswordLink.mockResolvedValue(undefined);

      await resolver.sendForgotPasswordLink(mockContext, {
        email: "user@example.com",
      });

      expect(mockAuthService.sendForgotPasswordLink).toHaveBeenCalledWith(
        "user@example.com",
        "unknown",
      );
    });
  });

  describe("resetPassword", () => {
    it("should reset password successfully", async () => {
      const args = {
        token: "reset-token-123",
        newPassword: "newSecurePassword123",
      };

      mockAuthService.resetPassword.mockResolvedValue(undefined);

      const result = await resolver.resetPassword(mockContext, args);

      expect(result).toEqual({ success: true });
      expect(mockAuthService.resetPassword).toHaveBeenCalledWith(
        "reset-token-123",
        "newSecurePassword123",
      );
    });

    it("should propagate errors from resetPassword", async () => {
      const args = { token: "invalid-token", newPassword: "newPassword123" };

      mockAuthService.resetPassword.mockRejectedValue(
        new Error("Invalid or expired token"),
      );

      await expect(resolver.resetPassword(mockContext, args)).rejects.toThrow(
        "Invalid or expired token",
      );
    });
  });

  describe("validateEmailToken", () => {
    it("should return isValid true for valid token", async () => {
      mockAuthService.validateEmailToken.mockResolvedValue(true);

      const result = await resolver.validateEmailToken(mockContext, {
        token: "valid-email-token",
      });

      expect(result).toEqual({ isValid: true });
      expect(mockAuthService.validateEmailToken).toHaveBeenCalledWith(
        "valid-email-token",
      );
    });

    it("should return isValid false for invalid token", async () => {
      mockAuthService.validateEmailToken.mockResolvedValue(false);

      const result = await resolver.validateEmailToken(mockContext, {
        token: "invalid-email-token",
      });

      expect(result).toEqual({ isValid: false });
    });
  });

  describe("signUp", () => {
    it("should create signup OTP session and return sessionId", async () => {
      const args = {
        email: "newuser@example.com",
        password: "password123",
        firstName: "Jane",
        lastName: "Smith",
        username: "janesmith",
        inviteSrc: "referral",
        inviteBy: "friend@example.com",
        withDefaultLedger: true,
      };

      const sessionId = "session-123";
      const sessionExpireAt = new Date(
        Date.now() + 15 * 60 * 1000,
      ).toISOString();

      mockAuthService.createSignUpSession.mockResolvedValue(sessionId);
      mockAuthService.getSignupOtpSession.mockResolvedValue({
        sessionId,
        expireAt: sessionExpireAt,
      } as unknown as SignupOtpSession);

      const result = await resolver.signUp(mockContext, args);

      expect(result.sessionId).toBe(sessionId);
      expect(result.expireAt).toBe(sessionExpireAt);
      // inviteSrc and inviteBy are accepted in API but no longer passed to service
      expect(mockAuthService.createSignUpSession).toHaveBeenCalledWith({
        email: "newuser@example.com",
        password: "password123",
        firstName: "Jane",
        lastName: "Smith",
        username: "janesmith",
        ip: "127.0.0.1",
        withDefaultLedger: true,
        sendCode: true,
      });
    });

    it("should handle optional fields as undefined", async () => {
      const args = {
        email: "newuser@example.com",
        password: "password123",
        firstName: "Jane",
        lastName: "Smith",
        username: undefined,
        inviteSrc: undefined,
        inviteBy: undefined,
        withDefaultLedger: undefined,
      };

      const sessionId = "session-123";
      mockAuthService.createSignUpSession.mockResolvedValue(sessionId);
      mockAuthService.getSignupOtpSession.mockResolvedValue({
        sessionId,
        expireAt: new Date().toISOString(),
      } as unknown as SignupOtpSession);

      await resolver.signUp(mockContext, args);

      expect(mockAuthService.createSignUpSession).toHaveBeenCalledWith({
        email: "newuser@example.com",
        password: "password123",
        firstName: "Jane",
        lastName: "Smith",
        username: null,
        ip: "127.0.0.1",
        withDefaultLedger: false,
        sendCode: true,
      });
    });

    it("should throw error if session retrieval fails", async () => {
      const args = {
        email: "newuser@example.com",
        password: "password123",
        firstName: "Jane",
        lastName: "Smith",
      };

      mockAuthService.createSignUpSession.mockResolvedValue("session-123");
      mockAuthService.getSignupOtpSession.mockResolvedValue(null);

      await expect(resolver.signUp(mockContext, args)).rejects.toThrow(
        "Failed to retrieve session after creation",
      );
    });

    it("keys the sign-up on the trusted client address, not x-real-ip", async () => {
      mockContext.reqHeaders = { "x-real-ip": "192.168.1.1" };
      const args = {
        email: "newuser@example.com",
        password: "password123",
        firstName: "Jane",
        lastName: "Smith",
      };

      const sessionId = "session-123";
      mockAuthService.createSignUpSession.mockResolvedValue(sessionId);
      mockAuthService.getSignupOtpSession.mockResolvedValue({
        sessionId,
        expireAt: new Date().toISOString(),
      } as unknown as SignupOtpSession);

      await resolver.signUp(mockContext, args);

      expect(mockAuthService.createSignUpSession).toHaveBeenCalledWith(
        expect.objectContaining({ ip: "127.0.0.1" }),
      );
    });
  });

  describe("verifySignUpOtp (delegation)", () => {
    it("delegates to the auth service and sets the auth cookie", async () => {
      const args = { sessionId: "session-123", otp: "1234" };
      const mockToken = { token: "jwt-token-123", expireAt: new Date() };
      mockAuthSessionWorkflow.verifySignUpOtp.mockResolvedValue(mockToken);

      const result = await resolver.verifySignUpOtp(mockContext, args);

      expect(result.token).toBe("jwt-token-123");
      expect(result.expireAt).toBe(mockToken.expireAt);
      expect(mockAuthSessionWorkflow.verifySignUpOtp).toHaveBeenCalledWith({
        sessionId: "session-123",
        otp: "1234",
        ip: "127.0.0.1",
      });
      expect((mockContext.koaCtx as any).cookies.set).toHaveBeenCalledWith(
        "authSess:beancount.io",
        "jwt-token-123",
        expect.objectContaining({ httpOnly: true, sameSite: "lax" }),
      );
    });

    it("propagates errors from the auth service", async () => {
      mockAuthSessionWorkflow.verifySignUpOtp.mockRejectedValue(
        new BadUserInputError("Invalid OTP code"),
      );

      await expect(
        resolver.verifySignUpOtp(mockContext, {
          sessionId: "session-123",
          otp: "wrong",
        }),
      ).rejects.toThrow(BadUserInputError);
    });
  });

  describe("signUp", () => {
    const args = {
      email: " New@Example.com ",
      password: "correct horse battery",
      firstName: "New",
      lastName: "Person",
    } as never;
    const session = { otp: "1234", expireAt: "2026-11-07T00:00:00.000Z" };

    beforeEach(() => {
      mockAuthService.createSignUpSession.mockResolvedValue("sess-1");
      mockAuthService.getSignupOtpSession.mockResolvedValue(session as never);
    });

    it("returns only the session when email verification is required", async () => {
      const result = await resolver.signUp(mockContext, args);
      expect(result).toEqual({
        sessionId: "sess-1",
        expireAt: session.expireAt,
      });
      expect(mockAuthSessionWorkflow.verifySignUpOtp).not.toHaveBeenCalled();
      expect((mockContext.koaCtx as any).cookies.set).not.toHaveBeenCalled();
    });

    it("completes the sign-up and signs the user in when self-hosted", async () => {
      const expireAt = new Date("2026-12-07T00:00:00.000Z");
      mockAuthSessionWorkflow.verifySignUpOtp.mockResolvedValue({
        token: "jwt-1",
        expireAt,
      } as never);
      mockContext.config = { env: "development", selfHost: true } as never;

      const result = await resolver.signUp(mockContext, args);

      expect(mockAuthService.createSignUpSession).toHaveBeenCalledWith(
        expect.objectContaining({ sendCode: false }),
      );
      expect(mockAuthSessionWorkflow.verifySignUpOtp).toHaveBeenCalledWith({
        sessionId: "sess-1",
        otp: "1234",
        ip: "127.0.0.1",
      });
      expect(result).toMatchObject({ token: "jwt-1", tokenExpireAt: expireAt });
      expect((mockContext.koaCtx as any).cookies.set).toHaveBeenCalledWith(
        "authSess:beancount.io",
        "jwt-1",
        expect.objectContaining({ httpOnly: true }),
      );
    });

    it("does not sign in when finishing the sign-up fails", async () => {
      mockAuthSessionWorkflow.verifySignUpOtp.mockRejectedValue(
        new BadUserInputError("Invalid or expired session"),
      );
      mockContext.config = { env: "development", selfHost: true } as never;
      await expect(resolver.signUp(mockContext, args)).rejects.toThrow(
        BadUserInputError,
      );
      expect((mockContext.koaCtx as any).cookies.set).not.toHaveBeenCalled();
    });
  });
});
