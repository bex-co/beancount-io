import "reflect-metadata";
import {
  generateSignupOtp,
  SignupOtpSessionRedisModel,
} from "../redis-impl";
import type { CreateSessionInput } from "../types";

const mockCache = {
  set: jest.fn().mockResolvedValue(undefined),
  get: jest.fn().mockResolvedValue(null),
  del: jest.fn().mockResolvedValue(undefined),
} as any;

const baseInput: CreateSessionInput = {
  email: "test@example.com",
  password: "password123",
  firstName: "John",
  lastName: "Doe",
  ip: "127.0.0.1",
};

describe("SignupOtpSessionRedisModel", () => {
  let model: SignupOtpSessionRedisModel;

  beforeEach(() => {
    model = new SignupOtpSessionRedisModel({ cache: mockCache });
    jest.clearAllMocks();
  });

  describe("createSession", () => {
    it("should create a session with a four-digit OTP", async () => {
      // No existing session for email
      mockCache.get.mockResolvedValue(null);

      const result = await model.createSession(baseInput);

      expect(result.email).toBe(baseInput.email);
      expect(result.password).toBe(baseInput.password);
      expect(result.firstName).toBe(baseInput.firstName);
      expect(result.lastName).toBe(baseInput.lastName);
      expect(result.ip).toBe(baseInput.ip);
      expect(result.id).toBeTruthy();
      expect(result.otp).toMatch(/^\d{4}$/);
      expect(result.expireAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("does not use Math.random to generate the OTP", () => {
      const mathRandom = jest
        .spyOn(Math, "random")
        .mockImplementation(() => {
          throw new Error("insecure PRNG called");
        });

      expect(generateSignupOtp()).toMatch(/^\d{4}$/);
      expect(mathRandom).not.toHaveBeenCalled();
      mathRandom.mockRestore();
    });

    it("should store session and email→session mapping with TTL", async () => {
      mockCache.get.mockResolvedValue(null);

      const result = await model.createSession(baseInput, 10);

      const ttlMs = 10 * 60 * 1000;

      // Session key stored with TTL
      expect(mockCache.set).toHaveBeenCalledWith(
        `auth:signup_otp_session:id:${result.id}`,
        JSON.stringify(result),
        ttlMs,
      );

      // Email mapping stored with TTL
      expect(mockCache.set).toHaveBeenCalledWith(
        `auth:signup_otp_session:email:${baseInput.email}`,
        result.id,
        ttlMs,
      );
    });

    it("should delete existing session for same email before creating", async () => {
      const existingSessionId = "existing-session-id";
      // deleteByEmail: get emailKey → returns existing session id
      mockCache.get
        .mockResolvedValueOnce(existingSessionId) // deleteByEmail: get emailKey
        .mockResolvedValueOnce(null); // createSession: after delete, nothing left

      await model.createSession(baseInput);

      expect(mockCache.del).toHaveBeenCalledWith(
        `auth:signup_otp_session:id:${existingSessionId}`,
      );
      expect(mockCache.del).toHaveBeenCalledWith(
        `auth:signup_otp_session:email:${baseInput.email}`,
      );
    });

    it("should use default expMins of 10", async () => {
      mockCache.get.mockResolvedValue(null);

      const result = await model.createSession(baseInput);

      expect(mockCache.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        10 * 60 * 1000,
      );

      // expireAt should be ~10 minutes in the future
      const expireDate = new Date(result.expireAt);
      expect(expireDate.getTime()).toBeGreaterThan(Date.now());
    });

    it("should default withDefaultLedger to false", async () => {
      mockCache.get.mockResolvedValue(null);

      const result = await model.createSession(baseInput);

      expect(result.withDefaultLedger).toBe(false);
    });

    it("should set username to null when not provided", async () => {
      mockCache.get.mockResolvedValue(null);

      const result = await model.createSession(baseInput);

      expect(result.username).toBeNull();
    });
  });

  describe("getSessionById", () => {
    it("should return null if not found", async () => {
      mockCache.get.mockResolvedValue(null);

      const result = await model.getSessionById("nonexistent");

      expect(result).toBeNull();
    });

    it("should return session data", async () => {
      const sessionData = {
        id: "sess1",
        email: "test@example.com",
        password: "pass",
        firstName: "John",
        lastName: "Doe",
        username: null,
        ip: "127.0.0.1",
        withDefaultLedger: false,
        otp: "1234",
        expireAt: new Date(Date.now() + 60000).toISOString(),
      };
      mockCache.get.mockResolvedValueOnce(JSON.stringify(sessionData));

      const result = await model.getSessionById("sess1");

      expect(result).toEqual(sessionData);
      expect(mockCache.del).not.toHaveBeenCalled();
    });
  });

  describe("deleteSessionById", () => {
    it("should do nothing if session not found", async () => {
      mockCache.get.mockResolvedValue(null);

      await model.deleteSessionById("nonexistent");

      expect(mockCache.del).not.toHaveBeenCalled();
    });

    it("should delete session and email mapping", async () => {
      const sessionData = {
        id: "sess1",
        email: "test@example.com",
        password: "pass",
        firstName: "John",
        lastName: "Doe",
        username: null,
        ip: "127.0.0.1",
        withDefaultLedger: false,
        otp: "1234",
        expireAt: new Date(Date.now() + 60000).toISOString(),
      };
      mockCache.get.mockResolvedValueOnce(JSON.stringify(sessionData));

      await model.deleteSessionById("sess1");

      expect(mockCache.del).toHaveBeenCalledWith(
        "auth:signup_otp_session:id:sess1",
      );
      expect(mockCache.del).toHaveBeenCalledWith(
        "auth:signup_otp_session:email:test@example.com",
      );
    });
  });

  describe("getSessionByEmail", () => {
    it("should return null when no session for email", async () => {
      mockCache.get.mockResolvedValue(null);

      const result = await model.getSessionByEmail("nobody@example.com");

      expect(result).toBeNull();
    });

    it("should return session data when email has active session", async () => {
      const sessionId = "sess1";
      const sessionData = {
        id: sessionId,
        email: "test@example.com",
        password: "pass",
        firstName: "John",
        lastName: "Doe",
        username: null,
        ip: "127.0.0.1",
        withDefaultLedger: false,
        otp: "4821",
        expireAt: new Date(Date.now() + 60000).toISOString(),
      };
      // Two-step lookup: email key → sessionId, then session key → JSON
      mockCache.get
        .mockResolvedValueOnce(sessionId)
        .mockResolvedValueOnce(JSON.stringify(sessionData));

      const result = await model.getSessionByEmail("test@example.com");

      expect(mockCache.get).toHaveBeenCalledWith(
        "auth:signup_otp_session:email:test@example.com",
      );
      expect(mockCache.get).toHaveBeenCalledWith(
        `auth:signup_otp_session:id:${sessionId}`,
      );
      expect(result).toEqual(sessionData);
    });
  });

  describe("deleteByEmail", () => {
    it("should do nothing if no session for email", async () => {
      mockCache.get.mockResolvedValue(null);

      await model.deleteByEmail("nobody@example.com");

      expect(mockCache.del).not.toHaveBeenCalled();
    });

    it("should delete session and email mapping", async () => {
      const sessionId = "sess1";
      mockCache.get.mockResolvedValueOnce(sessionId);

      await model.deleteByEmail("test@example.com");

      expect(mockCache.del).toHaveBeenCalledWith(
        "auth:signup_otp_session:id:sess1",
      );
      expect(mockCache.del).toHaveBeenCalledWith(
        "auth:signup_otp_session:email:test@example.com",
      );
    });
  });
});
