import "reflect-metadata";
import { AuthResolver } from "../auth-resolver";
import { IContext } from "@/server/graphql/context";
import type { IAuthService } from "@/features/auth/service/auth-service";
import { UnauthenticatedError, BadUserInputError } from "@/shared/errors";
import type { SignupOtpSession } from "@/features/auth/data/signup-otp-session-model";

describe("AuthResolver", () => {
  let resolver: AuthResolver;
  let mockContext: IContext;
  let mockAuthService: jest.Mocked<IAuthService>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockContext = {
      userId: "user-123",
      token: "mock-token",
      reqHeaders: {
        "x-forwarded-for": "127.0.0.1",
      },
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

    resolver = new AuthResolver(mockAuthService);
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

      mockAuthService.loginUser.mockResolvedValue(mockResponse);

      const result = await resolver.signIn(mockContext, args);

      expect(result).toEqual(mockResponse);
      expect(mockAuthService.loginUser).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "password123",
      });
    });

    it("should convert email to lowercase and trim whitespace", async () => {
      const args = { email: "  USER@EXAMPLE.COM  ", password: "password123" };
      const mockResponse = { token: "auth-token", expireAt: new Date() };

      mockAuthService.loginUser.mockResolvedValue(mockResponse);

      await resolver.signIn(mockContext, args);

      expect(mockAuthService.loginUser).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "password123",
      });
    });

    it("should propagate error when loginUser fails", async () => {
      const args = { email: "user@example.com", password: "wrongpassword" };

      mockAuthService.loginUser.mockRejectedValue(
        new BadUserInputError("Invalid email or password"),
      );

      await expect(resolver.signIn(mockContext, args)).rejects.toThrow(
        BadUserInputError,
      );
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

      mockAuthService.signInWithMagicLinkToken.mockResolvedValue(mockResponse);

      const result = await resolver.signInWithOneTimeToken(mockContext, args);

      expect(result).toEqual(mockResponse);
      expect(mockAuthService.signInWithMagicLinkToken).toHaveBeenCalledWith({
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

    it("should extract IP from x-forwarded-for header", async () => {
      mockContext.reqHeaders = {
        "x-forwarded-for": "203.0.113.1, 198.51.100.178",
      };
      mockAuthService.sendForgotPasswordLink.mockResolvedValue(undefined);

      await resolver.sendForgotPasswordLink(mockContext, {
        email: "user@example.com",
      });

      expect(mockAuthService.sendForgotPasswordLink).toHaveBeenCalledWith(
        "user@example.com",
        "203.0.113.1",
      );
    });

    it("should use x-real-ip as fallback", async () => {
      mockContext.reqHeaders = { "x-real-ip": "192.0.2.1" };
      mockAuthService.sendForgotPasswordLink.mockResolvedValue(undefined);

      await resolver.sendForgotPasswordLink(mockContext, {
        email: "user@example.com",
      });

      expect(mockAuthService.sendForgotPasswordLink).toHaveBeenCalledWith(
        "user@example.com",
        "192.0.2.1",
      );
    });

    it("should use 'unknown' when no IP headers available", async () => {
      mockContext.reqHeaders = {};
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

    it("should use x-real-ip as fallback for IP", async () => {
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
        expect.objectContaining({ ip: "192.168.1.1" }),
      );
    });
  });

  describe("verifySignUpOtp (delegation)", () => {
    it("delegates to the auth service and sets the auth cookie", async () => {
      const args = { sessionId: "session-123", otp: "123456" };
      const mockToken = { token: "jwt-token-123", expireAt: new Date() };
      mockAuthService.verifySignUpOtp.mockResolvedValue(mockToken);

      const result = await resolver.verifySignUpOtp(mockContext, args);

      expect(result.token).toBe("jwt-token-123");
      expect(result.expireAt).toBe(mockToken.expireAt);
      expect(mockAuthService.verifySignUpOtp).toHaveBeenCalledWith({
        sessionId: "session-123",
        otp: "123456",
      });
      expect((mockContext.koaCtx as any).cookies.set).toHaveBeenCalledWith(
        "authSess:beancount.io",
        "jwt-token-123",
        expect.objectContaining({ httpOnly: true, sameSite: "lax" }),
      );
    });

    it("propagates errors from the auth service", async () => {
      mockAuthService.verifySignUpOtp.mockRejectedValue(
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
});
