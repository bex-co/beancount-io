export type CliAuthSessionStatus =
  | "pending"
  | "authorized"
  | "denied"
  | "consumed";

/**
 * What the requesting CLI says about itself.
 *
 * Every field is self-reported, so none of it is evidence — it exists so the
 * consent screen can show *something a person can recognize* ("beancount-cli
 * 0.4 on tian-mbp") instead of an anonymous "a CLI wants access", which is the
 * prompt a phished user has no way to refuse. The UI labels it as reported by
 * the device; nothing here is ever an authorization input.
 */
export interface CliAuthClientInfo {
  /** Client name as reported, e.g. `beancount-cli`. */
  name: string;
  version?: string;
  /** Machine name the CLI runs on, as reported. */
  deviceLabel?: string;
  /** Operating system as reported, e.g. `darwin 25.5.0`. */
  platform?: string;
  /** Forwarded address seen when the session was created. Display only. */
  ipAddress?: string;
}

export interface CliAuthSession {
  id: string;
  status: CliAuthSessionStatus;
  /**
   * sha256 of the device code the CLI holds. The code itself is returned once,
   * at creation, and never stored — so this record, and every value the browser
   * sees, are useless for redeeming the credential.
   */
  deviceCodeDigest: string;
  /** The short code the person enters in the browser. Approves nothing alone. */
  userCode: string;
  client: CliAuthClientInfo;
  token?: string; // JWT — only set when status === 'authorized'
  expireAt?: string; // JWT expiry — only set when status === 'authorized'
  createdAt: string; // ISO timestamp
  /** Who approved, once someone has. Recorded for audit, never returned to the CLI. */
  approvedByUserId?: string;
}

export interface CreateCliAuthSessionInput {
  deviceCodeDigest: string;
  userCode: string;
  client: CliAuthClientInfo;
}

export interface ICliAuthSessionModel {
  createSession(input: CreateCliAuthSessionInput): Promise<CliAuthSession>;
  findById(id: string): Promise<CliAuthSession | null>;
  /** The CLI's own lookup: it presents the code, we address the record by its digest. */
  findByDeviceCodeDigest(digest: string): Promise<CliAuthSession | null>;
  /** The browser's lookup: the person typed the short code. */
  findByUserCode(userCode: string): Promise<CliAuthSession | null>;
  authorize(
    id: string,
    token: string,
    expireAt: string,
    approvedByUserId: string,
  ): Promise<void>;
  deny(id: string): Promise<void>;
  consume(id: string): Promise<CliAuthSession | null>;
}
