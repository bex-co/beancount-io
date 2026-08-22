import { createHash } from "node:crypto";
import { type DbExecutor } from "@/drizzle/drizzle";
import type { IGiteaClientFactory } from "@/foundation/clients/gitea-client-factory";
import type { IUserModel } from "@/features/auth/data/user-model";
import { logger } from "@/shared/logger";

const log = logger.child({ module: "ssh-auth" });

/**
 * Turning a presented public key into a user, with no SSH library involved —
 * the server hands over the raw key blob and gets back a decision.
 */

/**
 * OpenSSH's SHA256 fingerprint: base64 of the digest over the key blob, with
 * padding stripped. Gitea stores and searches keys in exactly this form.
 */
export function sshFingerprint(keyBlob: Buffer): string {
  const digest = createHash("sha256").update(keyBlob).digest("base64");
  return `SHA256:${digest.replace(/=+$/, "")}`;
}

export interface SshIdentity {
  userId: string;
  fingerprint: string;
  /**
   * Ready-to-use `Basic` credentials for Gitea's HTTP API, built from the user
   * row this lookup already read. The proxy speaks to Gitea over HTTP on the
   * internal network, and this is the same credential translation the HTTPS git
   * path performs — no new secret, and no second query per connection.
   */
  giteaAuth: string;
}

/**
 * Resolves an SSH key to a user by asking Gitea, which is where users actually
 * add and remove their keys.
 *
 * This deliberately keeps no copy. An earlier design mirrored Gitea's keys into
 * a local table and authenticated against that, which meant deleting a key in
 * Gitea's UI — the only place anyone can delete one — did not revoke SSH
 * access, because the user's own key was never shown to Gitea at all. Revoking
 * a key is something people do at the moment a laptop goes missing, so it has
 * to take effect on the next connection, not after a sync.
 */
export class SshAuthenticator {
  constructor(
    private readonly giteaClientFactory: IGiteaClientFactory,
    private readonly userModel: IUserModel,
    private readonly db: DbExecutor,
  ) {}

  /**
   * Resolve a presented key to a user, or null to refuse the connection.
   *
   * Fails closed on every unknown: a key Gitea does not know, an owner with no
   * account here, an unreachable Gitea. A key that cannot be attributed must
   * not reach the git backend at all — the request would otherwise have to be
   * made on behalf of an identity we picked.
   */
  async identify(keyBlob: Buffer): Promise<SshIdentity | null> {
    const fingerprint = sshFingerprint(keyBlob);

    let login: string | undefined;
    try {
      // Searching by fingerprint as admin returns the key whoever owns it,
      // together with its owner — one call, and no reading of Gitea's schema.
      const admin = this.giteaClientFactory.getAdminApiClient();
      // `format: "json"` is not optional: the generated client only parses the
      // body when a format is given, and otherwise leaves `data` null — which
      // reads exactly like "Gitea has never seen this key".
      const response = await admin.user.userCurrentListKeys(
        { fingerprint },
        { format: "json" },
      );
      const keys = response.data ?? [];

      // The server filters, but the match is re-checked here: accepting a key
      // the search returned for some other reason would authenticate the wrong
      // person, which is the one mistake this function must never make.
      login = keys.find((k) => k.fingerprint === fingerprint)?.user?.login;
    } catch (err) {
      log.error("gitea key lookup failed", {
        fingerprint,
        err: (err as Error).message,
      });
      return null;
    }

    if (!login) return null;

    const user = await this.userModel.getUserByUsername(this.db, login);
    if (!user) {
      // Gitea knows the key but we have no account for its owner. Rare, and not
      // something to guess our way through.
      log.warn("ssh key owner has no account here", { fingerprint, login });
      return null;
    }

    return {
      userId: user.id,
      fingerprint,
      giteaAuth: Buffer.from(
        `${user.ledger_username}:${user.ledger_password}`,
      ).toString("base64"),
    };
  }
}
