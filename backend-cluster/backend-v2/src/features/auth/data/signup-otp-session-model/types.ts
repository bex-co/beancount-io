// Database-agnostic type (no mongoose dependencies)
export interface SignupOtpSession {
  id: string; // Converted from ObjectId to string
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  username?: string | null;
  ip: string;
  withDefaultLedger: boolean;
  /** OAuth interaction this session may complete; absent for legacy callers. */
  oauthInteractionUid?: string;
  otp: string;
  expireAt: string;
}

// Input type for creating sessions
export interface CreateSessionInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  username?: string | null;
  ip: string;
  withDefaultLedger?: boolean;
  oauthInteractionUid?: string;
}

// Database-agnostic interface
export interface ISignupOtpSessionModel {
  createSession(
    sessionData: CreateSessionInput,
    expMins?: number,
  ): Promise<SignupOtpSession>;
  getSessionById(sessionId: string): Promise<SignupOtpSession | null>;
  getSessionByEmail(email: string): Promise<SignupOtpSession | null>;
  /**
   * Deletes signup OTP session by session ID.
   * Removes both the session data and email mapping from Redis.
   */
  deleteSessionById(sessionId: string): Promise<void>;
  deleteByEmail(email: string): Promise<void>;
}
