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
  useErrorMessage,
} from "@/common/lib/errors/error-message";
import { useUserLimits } from "@/common/hooks/use-user-limits";
import { useQueryRetry } from "@/common/hooks/use-query-retry";
import { LedgerAdminPermission } from "@/common/components/ledger-permission/admin";
import { LimitIndicator } from "@/common/components/limit-indicator";
import { CollaboratorRow } from "@/features/collaboration/components/collaborator-row";
import { InviteCollaboratorsDialog } from "@/features/collaboration/components/invite-collaborators-dialog";
import type { CollaboratorPermissionType } from "@/features/collaboration/components/types";

export function CollaboratorsSection({ ledgerId }: { ledgerId: string }) {
  const { t } = useTranslations();
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

  const [addLedgerCollaborator] = useMutation(AddLedgerCollaboratorDocument);
  const [deleteLedgerCollaborator] = useMutation(
    DeleteLedgerCollaboratorDocument,
  );
  const [leaveLedger] = useMutation(LeaveLedgerDocument);

  const handleInvite = async (
    users: SearchUser[],
    permission: CollaboratorPermissionType,
  ) => {
    try {
      await addLedgerCollaborator({
        variables: { ledgerId, collaborator: users[0].username, permission },
        refetchQueries: [
          { query: ListLedgerCollaboratorsDocument, variables: { ledgerId } },
        ],
        awaitRefetchQueries: true,
      });
      toast.success(t("collaboration.collaboratorAddedSuccess"));
    } catch (error) {
      // The owner's plan sets the limit: telling anyone else to upgrade
      // would not help (w1/181).
      const ownersLimit =
        getErrorMessageKey(error) === "common.errors.resourceLimitReached" &&
        ledgerId.split("/")[0]?.toLowerCase() !==
          currentUserLogin?.toLowerCase();
      toast.error(t("collaboration.failedToAddCollaborator"), {
        description: ownersLimit
          ? t("collaboration.ownerPlanLimitReached")
          : formatError(error),
      });
    }
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
  // Both the loading and the member tables carry the card's own title.
  const titleId = useId();

  return (
    <Card>
      <CardHeader>
        <CardTitle id={titleId}>{t("collaboration.collaborators")}</CardTitle>
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
                      <TableCell className="text-right">
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
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {t("collaboration.noCollaborators")}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t("collaboration.noCollaboratorsDescription")}
              </p>
              <LedgerAdminPermission>
                <InviteCollaboratorsDialog onInvite={handleInvite} />
              </LedgerAdminPermission>
            </div>
          )}

        {!collaboratorsLoading &&
          !collaboratorsFailure &&
          collaborators.length > 0 && (
            <div className="space-y-4">
              <LedgerAdminPermission>
                <div className="flex items-center justify-end">
                  <InviteCollaboratorsDialog onInvite={handleInvite} />
                </div>
              </LedgerAdminPermission>
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
                      <TableHead className="w-20 text-right">
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
