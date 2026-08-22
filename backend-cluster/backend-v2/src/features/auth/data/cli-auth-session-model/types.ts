export type CliAuthSessionStatus =
  | "pending"
  | "authorized"
  | "denied"
  | "consumed";

export interface CliAuthSession {
  id: string;
  status: CliAuthSessionStatus;
  token?: string; // JWT — only set when status === 'authorized'
  expireAt?: string; // JWT expiry — only set when status === 'authorized'
  createdAt: string; // ISO timestamp
}

export interface ICliAuthSessionModel {
  createSession(): Promise<CliAuthSession>;
  findById(id: string): Promise<CliAuthSession | null>;
  authorize(id: string, token: string, expireAt: string): Promise<void>;
  deny(id: string): Promise<void>;
  consume(id: string): Promise<CliAuthSession | null>;
  findOneAndDelete(id: string): Promise<CliAuthSession | null>;
}
