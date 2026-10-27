import { type IStripeService } from "@/features/stripe/service/stripe-service";
import { assertHostPage } from "@/shared/host-page";
import { type IFavaClientFactory } from "@/foundation/clients/fava-client-factory";
import {
  getTierLimits,
  TIER_DISPLAY_NAMES,
} from "@/features/stripe/service/stripe";
import { getUserTier } from "@/features/stripe/operations/get-user-tier";
import { parseLedgerId } from "@/shared/str";
import {
  BadUserInputError,
  DomainError,
  ErrorCategory,
  InternalServerError,
  OperationNotAllowedError,
  ResourceLimitReachedError,
} from "@/shared/errors";
import type { DbExecutor } from "@/drizzle/drizzle";
import type { IModels } from "@/foundation/models";
import { readGiteaPages } from "@/shared/gitea-pages";
import { UserPublic, unwrapFavaResponse } from "@/foundation/fava";
import { logger } from "@/shared/logger";
import type { Identity } from "@/server/api/identity";
import {
  AUTHORIZATION_ACTIONS,
  ledgerResource,
  type IAuthorizationService,
} from "@/server/api/authorization";

const moduleLogger = logger.child({ module: "ledger-collaborators-workflow" });

/**
 * Gitea reports an unknown username as "user does not exist
 * [uid: 0, name: …]" — an internal shape no agent can act on. The
 * collaborator name came from the caller, so this is their input error.
 * Anything else is returned unchanged for the caller to rethrow.
 */
function translateUnknownUser(error: unknown, collaborator: string): unknown {
  const message = error instanceof Error ? error.message : String(error);
  return /user does not exist/i.test(message)
    ? new BadUserInputError(`No such user: ${collaborator}`)
    : error;
}

/**
 * A blank collaborator name is refused here rather than only in the adapters'
 * schemas, because GraphQL hands its string argument over unvalidated. Sent
 * upstream it fails opaquely and reads as a server fault.
 */
function assertCollaboratorName(collaborator: string): void {
  if (collaborator.trim() === "") {
    throw new BadUserInputError(
      "collaborator must be a non-empty username",
      "collaborator",
    );
  }
}

/**
 * The owner is not a collaborator (w23/025). The repository host no-ops a
 * grant or removal naming the owner and still reports success, so "give the
 * owner read access" or "remove me" read as done while nothing changed — and
 * nothing could: an owner's access is not a collaborator grant. Logins are
 * case-insensitive, as the limit check compares them.
 */
function assertNotOwner(
  operation: string,
  collaborator: string,
  ledgerOwner: string,
): void {
  if (collaborator.toLowerCase() === ledgerOwner.toLowerCase()) {
    throw new OperationNotAllowedError(
      operation,
      `${collaborator} owns this ledger; an owner's access can't be granted or removed as a collaborator`,
      "Name another user: the owner already has full access, which comes with owning the ledger.",
    );
  }
}

export type CollaboratorData = {
  id?: number;
  login?: string;
  fullName?: string;
  email?: string;
  active?: boolean;
  isAdmin?: boolean;
  created?: string;
  lastLogin?: string;
  permission?: "read" | "write" | "admin";
};

export type CollaboratorPermissionData = {
  permission?: string;
  roleName?: string;
  user?: {
    id?: number;
    login?: string;
    fullName?: string;
    email?: string;
    active?: boolean;
    isAdmin?: boolean;
    created?: string;
    lastLogin?: string;
  };
};

/**
 * What a collaborator mutation preview renders (w23/m13/t004): whose access
 * would change, from what to what. `current` is null when they hold no
 * grant; `requested` is null for removals.
 */
type CollaboratorPreview = {
  collaborator: string;
  current: "read" | "write" | "admin" | null;
  requested: "read" | "write" | "admin" | null;
  warnings: string[];
};

export type CollaboratorMutationResult = {
  success: boolean;
  message?: string;
  dryRun?: boolean;
  preview?: CollaboratorPreview;
};

export interface ILedgerCollaboratorsWorkflow {
  addOrUpdateCollaborator(params: {
    identity: Identity;
    ledgerId: string;
    collaborator: string;
    permission?: "read" | "write" | "admin";
    input?: { dryRun?: boolean };
  }): Promise<CollaboratorMutationResult>;

  deleteCollaborator(params: {
    identity: Identity;
    ledgerId: string;
    collaborator: string;
    input?: { dryRun?: boolean };
  }): Promise<CollaboratorMutationResult>;

  listCollaborators(params: {
    identity: Identity;
    ledgerId: string;
    page?: number;
    limit?: number;
  }): Promise<CollaboratorData[]>;

  getCollaboratorPermission(params: {
    identity: Identity;
    ledgerId: string;
    collaborator: string;
  }): Promise<CollaboratorPermissionData>;

  leaveLedger(params: {
    identity: Identity;
    ledgerId: string;
    input?: { dryRun?: boolean };
  }): Promise<CollaboratorMutationResult>;
}

type FavaPublicClient = Awaited<
  ReturnType<IFavaClientFactory["getPublicApiClient"]>
>;

export class LedgerCollaboratorsWorkflow implements ILedgerCollaboratorsWorkflow {
  constructor(
    private readonly favaClientFactory: IFavaClientFactory,
    private readonly stripe: IStripeService,
    private readonly authorization: IAuthorizationService,
    private readonly models: Pick<IModels, "user">,
    private readonly db: DbExecutor,
  ) {}

  /**
   * Every collaborator on the ledger, for the limit check and for previews
   * to tell a new grant from a permission change. A list that cannot be
   * read refuses the change rather than skipping the limit.
   */
  private async listAllMembers(
    favaApiClient: FavaPublicClient,
    ledgerOwner: string,
    ledgerName: string,
  ) {
    return readGiteaPages((query) =>
      unwrapFavaResponse(
        favaApiClient.collaborators.listLedgerCollaborators(
          ledgerOwner,
          ledgerName,
          query,
        ),
        "list collaborators",
      ),
    );
  }

  /**
   * Best-effort current permission for a preview (w23/m13/t004): the value
   * when the host answers with one, null when it cannot say — an unknown
   * user, a non-collaborator, or an unreadable grant all read as "no
   * confirmed access", and the preview's warnings say so. A preview never
   * fails on this read; the commit's own checks still apply when it runs.
   */
  private async readCurrentPermission(
    favaApiClient: FavaPublicClient,
    ledgerOwner: string,
    ledgerName: string,
    collaborator: string,
  ): Promise<"read" | "write" | "admin" | null> {
    let response;
    try {
      response =
        await favaApiClient.collaborators.getLedgerCollaboratorPermission(
          ledgerOwner,
          ledgerName,
          collaborator,
        );
    } catch {
      return null;
    }
    const value = response.data?.success
      ? response.data.data?.permission
      : undefined;
    return value === "read" || value === "write" || value === "admin"
      ? value
      : null;
  }

  /**
   * The leave authorization with its concealed-denial translation, shared
   * by the commit and the preview: previewing a leave requires leave
   * authority, and gets the same real reason when it is missing.
   */
  private async authorizeLeave(
    identity: Identity,
    ledgerId: string,
  ): Promise<void> {
    try {
      await this.authorization.authorizeOrThrow({
        principal: identity,
        action: AUTHORIZATION_ACTIONS.LEDGER_COLLABORATORS_LEAVE,
        resource: ledgerResource(ledgerId),
      });
    } catch (error) {
      if (
        error instanceof DomainError &&
        error.category === ErrorCategory.NOT_FOUND
      ) {
        await this.refuseUnleavable(identity, ledgerId);
      }
      throw error;
    }
  }

  /**
   * The collaborator limit is the ledger owner's plan, whoever adds the
   * collaborator (PRFAQ005). A ledger owned by an organization with no
   * account behind it falls back to the acting user's plan.
   */
  private async ownerTier(ledgerOwner: string, actingUserId: string) {
    const owner = await this.models.user.getUserByUsername(
      this.db,
      ledgerOwner,
    );
    if (!owner) {
      moduleLogger.info("No account owns the ledger; using the actor's plan", {
        ledgerOwner,
      });
    }
    return getUserTier({
      stripe: this.stripe,
      userId: owner?.id ?? actingUserId,
    });
  }

  async addOrUpdateCollaborator(params: {
    identity: Identity;
    ledgerId: string;
    collaborator: string;
    permission?: "read" | "write" | "admin";
    input?: { dryRun?: boolean };
  }): Promise<CollaboratorMutationResult> {
    const { identity, ledgerId, collaborator, permission, input } = params;
    assertCollaboratorName(collaborator);
    await this.authorization.authorizeOrThrow({
      principal: identity,
      action: AUTHORIZATION_ACTIONS.LEDGER_COLLABORATORS_UPDATE,
      resource: ledgerResource(ledgerId),
    });
    const userId = identity.userId;
    const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);
    assertNotOwner("setLedgerCollaborator", collaborator, ledgerOwner);
    const [favaApiClient, ownerTier] = await Promise.all([
      this.favaClientFactory.getPublicApiClient(ledgerId, userId),
      this.ownerTier(ledgerOwner, userId),
    ]);
    const { maxCollaboratorsPerLedger: max } = getTierLimits(ownerTier);

    // Gitea logins are case-insensitive.
    const is = (login: string | null | undefined, name: string) =>
      login?.toLowerCase() === name.toLowerCase();
    const existing =
      max !== -1
        ? await this.listAllMembers(favaApiClient, ledgerOwner, ledgerName)
        : [];
    const isNew =
      max === -1 || !existing.some((c) => is(c.login, collaborator));

    // The preview renders the would-be grant — new or changed — under the
    // commit's authority, and runs the same limit check, so "would grant"
    // never promises what the commit would refuse (w23/m13/t004). Nothing
    // below the preview branch runs: no grant, no write of any kind.
    if (input?.dryRun === true) {
      const current = isNew
        ? null
        : await this.readCurrentPermission(
            favaApiClient,
            ledgerOwner,
            ledgerName,
            collaborator,
          );
      const requested = permission ?? null;
      const warnings = isNew
        ? [
            `This would add ${collaborator} to ${ledgerId} with ${requested ?? "the repository default"} access.`,
            `If ${collaborator} names no known user, applying this would fail.`,
          ]
        : [
            current === null
              ? `This would grant ${collaborator} ${requested ?? "default"} access to ${ledgerId}, but their current access could not be confirmed.`
              : `This would change ${collaborator}'s access to ${ledgerId} from ${current} to ${requested ?? current}.`,
          ];
      this.assertWithinLimit(ownerTier, max, existing, ledgerOwner, isNew);
      return {
        success: true,
        message: "Preview only; no changes were made.",
        dryRun: true,
        preview: { collaborator, current, requested, warnings },
      };
    }

    // Changing an existing collaborator's permission never counts.
    this.assertWithinLimit(ownerTier, max, existing, ledgerOwner, isNew);

    let response;
    try {
      response =
        await favaApiClient.collaborators.addOrUpdateLedgerCollaborator(
          ledgerOwner,
          ledgerName,
          collaborator,
          { permission: permission || null },
        );
    } catch (error) {
      throw translateUnknownUser(error, collaborator);
    }

    if (response.data?.success) {
      return {
        success: true,
        message: "Collaborator added/updated successfully",
        dryRun: false,
      };
    }

    throw new InternalServerError("Failed to add/update collaborator");
  }

  /**
   * The collaborator limit both the commit and the set preview enforce: a
   * new grant at the cap refuses, whatever the path. Unlimited plans
   * (`max === -1`) skip the list entirely, as before.
   */
  private assertWithinLimit(
    ownerTier: Parameters<typeof getTierLimits>[0],
    max: number,
    existing: readonly { login?: string | null }[],
    ledgerOwner: string,
    isNew: boolean,
  ): void {
    if (max === -1) return;
    const is = (login: string | null | undefined, name: string) =>
      login?.toLowerCase() === name.toLowerCase();
    const count = existing.filter((c) => !is(c.login, ledgerOwner)).length;
    if (isNew && count >= max) {
      throw new ResourceLimitReachedError(
        "Collaborator",
        max,
        count,
        `This ledger's owner is on the ${TIER_DISPLAY_NAMES[ownerTier]} plan, which allows ${max} ${max === 1 ? "collaborator" : "collaborators"} per ledger, and it already has ${count}. The ledger owner can upgrade for more.`,
      );
    }
  }

  async deleteCollaborator(params: {
    identity: Identity;
    ledgerId: string;
    collaborator: string;
    input?: { dryRun?: boolean };
  }): Promise<CollaboratorMutationResult> {
    const { identity, ledgerId, collaborator, input } = params;
    assertCollaboratorName(collaborator);
    await this.authorization.authorizeOrThrow({
      principal: identity,
      action: AUTHORIZATION_ACTIONS.LEDGER_COLLABORATORS_DELETE,
      resource: ledgerResource(ledgerId),
    });
    const userId = identity.userId;
    const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);
    assertNotOwner("removeLedgerCollaborator", collaborator, ledgerOwner);
    const favaApiClient = await this.favaClientFactory.getPublicApiClient(
      ledgerId,
      userId,
    );

    // The preview renders the would-be revocation under the commit's
    // authority; nothing below the preview branch runs — no revocation,
    // no write of any kind (w23/m13/t004).
    if (input?.dryRun === true) {
      const current = await this.readCurrentPermission(
        favaApiClient,
        ledgerOwner,
        ledgerName,
        collaborator,
      );
      const warnings = [
        current === null
          ? `This would revoke ${collaborator}'s access to ${ledgerId}, but no current access could be confirmed — the removal may fail if they hold no grant.`
          : `This would revoke ${collaborator}'s ${current} access to ${ledgerId}.`,
      ];
      return {
        success: true,
        message: "Preview only; no changes were made.",
        dryRun: true,
        preview: { collaborator, current, requested: null, warnings },
      };
    }

    let response;
    try {
      response = await favaApiClient.collaborators.deleteLedgerCollaborator(
        ledgerOwner,
        ledgerName,
        collaborator,
      );
    } catch (error) {
      throw translateUnknownUser(error, collaborator);
    }

    if (response.data?.success) {
      return {
        success: true,
        message: "Collaborator deleted successfully",
        dryRun: false,
      };
    }

    throw new InternalServerError("Failed to delete collaborator");
  }

  async listCollaborators(params: {
    identity: Identity;
    ledgerId: string;
    page?: number;
    limit?: number;
  }): Promise<CollaboratorData[]> {
    const { identity, ledgerId, page = 1, limit = 10 } = params;
    assertHostPage(page, limit);
    await this.authorization.authorizeOrThrow({
      principal: identity,
      action: AUTHORIZATION_ACTIONS.LEDGER_COLLABORATORS_LIST,
      resource: ledgerResource(ledgerId),
    });
    const userId = identity.userId;
    const favaApiClient = await this.favaClientFactory.getPublicApiClient(
      ledgerId,
      userId,
    );
    const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);

    const response = await favaApiClient.collaborators.listLedgerCollaborators(
      ledgerOwner,
      ledgerName,
      { page, limit },
    );

    if (!response.data?.success || !response.data.data) {
      throw new InternalServerError("Failed to fetch collaborators");
    }

    const validPermissions = ["read", "write", "admin"] as const;

    const permissionResults = await Promise.allSettled(
      response.data.data.map(async (user: UserPublic) => {
        const permission =
          await favaApiClient.collaborators.getLedgerCollaboratorPermission(
            ledgerOwner,
            ledgerName,
            user.login ?? "",
          );
        return { user, permission };
      }),
    );

    return permissionResults
      .map((result) => {
        if (result.status === "rejected") {
          moduleLogger.error("Failed to fetch collaborator permission", {
            reason: result.reason,
          });
          return null;
        }

        const { user, permission } = result.value;
        const permissionValue = permission.data?.data?.permission;
        const validatedPermission =
          permissionValue &&
          validPermissions.includes(
            permissionValue as (typeof validPermissions)[number],
          )
            ? (permissionValue as "read" | "write" | "admin")
            : undefined;

        return {
          id: user.id ?? undefined,
          login: user.login ?? undefined,
          fullName: user.full_name ?? undefined,
          email: user.email ?? undefined,
          active: user.active ?? undefined,
          isAdmin: user.is_admin ?? undefined,
          created: user.created ?? undefined,
          lastLogin: user.last_login ?? undefined,
          permission: validatedPermission,
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);
  }

  async getCollaboratorPermission(params: {
    identity: Identity;
    ledgerId: string;
    collaborator: string;
  }): Promise<CollaboratorPermissionData> {
    const { identity, ledgerId, collaborator } = params;
    assertCollaboratorName(collaborator);
    await this.authorization.authorizeOrThrow({
      principal: identity,
      action: AUTHORIZATION_ACTIONS.LEDGER_COLLABORATORS_PERMISSION_READ,
      resource: ledgerResource(ledgerId),
    });
    const userId = identity.userId;
    const favaApiClient = await this.favaClientFactory.getPublicApiClient(
      ledgerId,
      userId,
    );
    const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);

    let response;
    try {
      response =
        await favaApiClient.collaborators.getLedgerCollaboratorPermission(
          ledgerOwner,
          ledgerName,
          collaborator,
        );
    } catch (error) {
      throw translateUnknownUser(error, collaborator);
    }

    if (!response.data?.success || !response.data.data) {
      throw new InternalServerError("Failed to fetch collaborator permission");
    }

    const data = response.data.data;
    return {
      permission: data.permission ?? undefined,
      roleName: data.role_name ?? undefined,
      user: data.user
        ? {
            id: data.user.id ?? undefined,
            login: data.user.login ?? undefined,
            fullName: data.user.full_name ?? undefined,
            email: data.user.email ?? undefined,
            active: data.user.active ?? undefined,
            isAdmin: data.user.is_admin ?? undefined,
            created: data.user.created ?? undefined,
            lastLogin: data.user.last_login ?? undefined,
          }
        : undefined,
    };
  }

  async leaveLedger(params: {
    identity: Identity;
    ledgerId: string;
    input?: { dryRun?: boolean };
  }): Promise<CollaboratorMutationResult> {
    const { identity, ledgerId, input } = params;
    await this.authorizeLeave(identity, ledgerId);
    const userId = identity.userId;

    // The preview renders the would-be self-removal under leave authority;
    // nothing below the preview branch runs — the grant stays (w23/m13/t004).
    if (input?.dryRun === true) {
      const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);
      const [{ favaUser }, favaApiClient] = await Promise.all([
        this.favaClientFactory.getApiContext(userId),
        this.favaClientFactory.getPublicApiClient(ledgerId, userId),
      ]);
      const current = await this.readCurrentPermission(
        favaApiClient,
        ledgerOwner,
        ledgerName,
        favaUser.username,
      );
      const warnings = [
        current === null
          ? `This would remove your (${favaUser.username}) access to ${ledgerId}, but no current access could be confirmed.`
          : `This would remove your (${favaUser.username}) ${current} access to ${ledgerId}.`,
      ];
      return {
        success: true,
        message: "Preview only; no changes were made.",
        dryRun: true,
        preview: {
          collaborator: favaUser.username,
          current,
          requested: null,
          warnings,
        },
      };
    }

    const { favaUser } = await this.favaClientFactory.getApiContext(userId);
    const favaAdminApiClient = this.favaClientFactory.getAdminClient();
    const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);

    const response =
      await favaAdminApiClient.collaborators.deleteLedgerCollaborator(
        ledgerOwner,
        ledgerName,
        favaUser.username,
      );

    if (response.data?.success) {
      return {
        success: true,
        message: "Removed self from repository successfully",
        dryRun: false,
      };
    }

    throw new InternalServerError("Failed to remove self from repository");
  }

  /**
   * Only an explicit collaborator can leave; anyone else is denied, and the
   * denial is concealed as "Ledger not found" so a ledger stays invisible
   * to who cannot see it. A caller who can read it — its owner, or a reader
   * of a public ledger — was told it did not exist, and an agent concluded
   * it was gone (w23/063). Those callers get the real reason.
   */
  private async refuseUnleavable(
    identity: Identity,
    ledgerId: string,
  ): Promise<void> {
    const readable = await this.authorization.authorize({
      principal: identity,
      action: AUTHORIZATION_ACTIONS.LEDGER_METADATA_READ,
      resource: ledgerResource(ledgerId),
    });
    if (!readable.allowed) return;
    const { favaUser } = await this.favaClientFactory.getApiContext(
      identity.userId,
    );
    const { ledgerOwner } = parseLedgerId(ledgerId);
    if (favaUser.username.toLowerCase() === ledgerOwner.toLowerCase()) {
      throw new OperationNotAllowedError(
        "leave ledger",
        `${favaUser.username} owns this ledger; an owner can't leave it`,
        "An owner's access comes with owning the ledger. To give it up, delete the ledger with `deleteLedger`.",
      );
    }
    throw new OperationNotAllowedError(
      "leave ledger",
      `${favaUser.username} is not a collaborator on this ledger, so there is nothing to leave`,
      "Leaving removes your own collaborator grant; you can read this ledger without one.",
    );
  }
}
