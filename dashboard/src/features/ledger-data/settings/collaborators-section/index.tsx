import { useId } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@apollo/client/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/common/components/ui/table";
import { Skeleton } from "@/common/components/ui/skeleton";
import { Button } from "@/common/components/ui/button";
import { Users, AlertCircle } from "lucide-react";
import {
  ListLedgersDocument,
  ListLedgerCollaboratorsDocument,
  AddLedgerCollaboratorDocument,
  DeleteLedgerCollaboratorDocument,
  LeaveLedgerDocument,
  GetCurrentUserDocument,
  type ListLedgerCollaboratorsQuery,
  type ListLedgerCollaboratorsQueryVariables,
  type SearchUser,
} from "@/graphql/definitions";
import { toast } from "sonner";
import { useTranslations } from "@/common/hooks/use-translations";
import {
  getErrorMessageKey,
  isOwnerLimitError,
  useErrorMessage,
} from "@/common/lib/errors/error-message";
import { useUserLimits } from "@/common/hooks/use-user-limits";
import { isLedgerOwnerName } from "@/common/hooks/use-is-ledger-owner";
import { useQueryRetry } from "@/common/hooks/use-query-retry";
import { LedgerAdminPermission } from "@/common/components/ledger-permission/admin";
import { LimitIndicator } from "@/common/components/limit-indicator";
import { CollaboratorRow } from "@/features/collaboration/components/collaborator-row";
import { InviteCollaboratorsDialog } from "@/features/collaboration/components/invite-collaborators-dialog";
import type {
  CollaboratorPermissionType,
  InviteFailure,
} from "@/features/collaboration/components/types";

export function CollaboratorsSection({ ledgerId }: { ledgerId: string }) {
  const { t, i18n } = useTranslations();
  const formatError = useErrorMessage();
  const navigate = useNavigate();
  const { limits, tier } = useUserLimits();

  const {
    data: collaboratorsData,
    loading: collaboratorsLoading,
    error: collaboratorsError,
    refetch: refetchCollaborators,
  } = useQuery<
    ListLedgerCollaboratorsQuery,
    ListLedgerCollaboratorsQueryVariables
  >(ListLedgerCollaboratorsDocument, {
    variables: { ledgerId },
    skip: !ledgerId,
  });
  // Try Again re-reads this list in place: the error and its busy button stay
  // while it runs, and another failure hands focus back (w4/1050).
  const {
    failure: collaboratorsFailure,
    retrying: collaboratorsRetrying,
    retry: retryCollaborators,
  } = useQueryRetry(collaboratorsError, refetchCollaborators, ledgerId);

  const { data: currentUserData } = useQuery(GetCurrentUserDocument);
  const currentUserLogin = currentUserData?.userProfile?.username || null;
  const isOwner = isLedgerOwnerName(ledgerId.split("/")[0], currentUserLogin);

  const [addLedgerCollaborator] = useMutation(AddLedgerCollaboratorDocument);
  const [deleteLedgerCollaborator] = useMutation(
    DeleteLedgerCollaboratorDocument,
  );
  const [leaveLedger] = useMutation(LeaveLedgerDocument);

  const handleInvite = async (
    users: SearchUser[],
    permission: CollaboratorPermissionType,
  ) => {
    const failed: InviteFailure[] = [];
    const added: string[] = [];
    // Each add checks the ledger owner's collaborator limit. Finish one
    // before starting the next so each request sees the previous result.
    for (const { username } of users) {
      try {
        const { data } = await addLedgerCollaborator({
          variables: { ledgerId, collaborator: username, permission },
        });
        const result = data?.addOrUpdateLedgerCollaborator;
        if (result?.success) {
          added.push(username);
        } else {
          failed.push({
            username,
            reason:
              result?.message || t("collaboration.failedToAddCollaborator"),
          });
        }
      } catch (error) {
        // The owner's plan sets the limit (w1/181).
        const reason = isOwnerLimitError(error)
          ? isOwner
            ? t("common.errors.resourceLimitReached")
            : t("collaboration.ownerPlanLimitReached")
          : formatError(error);
        failed.push({ username, reason });
      }
    }
    // Refresh once. A failed list read has its own Try Again in this card.
    await refetchCollaborators().catch(() => undefined);
    if (added.length) {
      const message = t("collaboration.collaboratorAddedSuccess", {
        count: added.length,
      });
      if (failed.length) {
        toast.success(message, {
          description: new Intl.ListFormat(i18n.language).format(added),
        });
      } else {
        toast.success(message);
      }
    }
    return failed;
  };

  const handleRemove = async (collaborator: string) => {
    try {
      await deleteLedgerCollaborator({
        variables: { ledgerId, collaborator },
        refetchQueries: [
          { query: ListLedgerCollaboratorsDocument, variables: { ledgerId } },
        ],
        awaitRefetchQueries: true,
      });
      toast.success(t("collaboration.collaboratorRemovedSuccess"));
    } catch (error) {
      toast.error(t("collaboration.failedToRemoveCollaborator"), {
        description: formatError(error),
      });
    }
  };

  const handleExit = async () => {
    try {
      await leaveLedger({
        variables: { ledgerId },
        refetchQueries: [
          { query: ListLedgersDocument, variables: { ledgerId } },
        ],
        awaitRefetchQueries: true,
      });
      toast.success(t("collaboration.leftLedgerSuccess"));
      void navigate({ to: "/ledger" });
    } catch (error) {
      toast.error(t("collaboration.failedToLeaveLedger"), {
        description: formatError(error),
      });
    }
  };

  const collaborators = collaboratorsData?.listLedgerCollaborators || [];
  const showInvite = !collaboratorsLoading && !collaboratorsFailure;
  // Both the loading and the member tables carry the card's own title.
  const titleId = useId();

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 id={titleId}>{t("collaboration.collaborators")}</h2>
        </CardTitle>
        <CardDescription>
          {t("page.settings.collaboratorsDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <LedgerAdminPermission>
          {limits && collaborators.length > 0 && (
            <LimitIndicator
              used={collaborators.length}
              max={limits.collaboratorsPerLedgerMax}
              limitType="collaborators"
              tier={tier}
              ownedByOther={!isOwner}
              variant="alert"
            />
          )}
        </LedgerAdminPermission>

        {collaboratorsLoading && !collaboratorsFailure && (
          <div className="space-y-4">
            <div className="flex items-center justify-end">
              <Skeleton className="h-10 w-45" />
            </div>
            <div className="rounded-md border">
              <Table aria-labelledby={titleId}>
                <TableBody>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell className="flex items-center space-x-3">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-37.5" />
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Skeleton className="h-4 w-45" />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Skeleton className="h-4 w-25" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-15" />
                      </TableCell>
                      <TableCell className="text-end">
                        <Skeleton className="h-8 w-8 ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {collaboratorsFailure && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-destructive">
              {t("collaboration.errorLoadingCollaborators")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t(getErrorMessageKey(collaboratorsFailure))}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={retryCollaborators}
              loading={collaboratorsRetrying}
            >
              {t("common.tryAgain")}
            </Button>
          </div>
        )}

        {!collaboratorsLoading &&
          !collaboratorsFailure &&
          collaborators.length === 0 && (
            <div className="flex flex-col items-center justify-center pt-8 text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {t("collaboration.noCollaborators")}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t("collaboration.noCollaboratorsDescription")}
              </p>
            </div>
          )}

        {/* Keep the dialog mounted when a refresh moves this card from empty
            to populated or a read fails while there are failed invites. */}
        <LedgerAdminPermission>
          <div
            hidden={!showInvite}
            className={
              showInvite
                ? collaborators.length
                  ? "flex justify-end"
                  : "flex justify-center pb-8"
                : undefined
            }
          >
            <InviteCollaboratorsDialog key={ledgerId} onInvite={handleInvite} />
          </div>
        </LedgerAdminPermission>

        {!collaboratorsLoading &&
          !collaboratorsFailure &&
          collaborators.length > 0 && (
            <div className="space-y-4">
              <div className="rounded-md border">
                <Table aria-labelledby={titleId}>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("collaboration.user")}</TableHead>
                      <TableHead className="hidden md:table-cell">
                        {t("auth.email")}
                      </TableHead>
                      <TableHead className="hidden md:table-cell">
                        {t("collaboration.joined")}
                      </TableHead>
                      <TableHead>{t("collaboration.permission")}</TableHead>
                      <TableHead className="w-20 text-end">
                        {t("common.actions")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {collaborators.map((collaborator) => (
                      <CollaboratorRow
                        key={collaborator.id}
                        collaborator={collaborator}
                        onRemove={handleRemove}
                        currentUserLogin={currentUserLogin}
                        onExit={handleExit}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
      </CardContent>
    </Card>
  );
}
