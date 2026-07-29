import { useMutation } from "@apollo/client/react";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/common/components/ui/table";
import { toast } from "sonner";
import { createLedgerId } from "@/common/lib/utils/encode";
import { useTranslations } from "@/common/hooks/use-translations";
import { useErrorMessage } from "@/common/lib/errors/error-message";
import { LedgerAdminPermission } from "@/common/components/ledger-permission/admin";
import {
  ListLedgersDocument,
  ListLedgerCollaboratorsDocument,
  DeleteLedgerCollaboratorDocument,
  LeaveLedgerDocument,
  type ListLedgerCollaboratorsQuery,
} from "@/graphql/definitions";
import type { HandleInviteFunc } from "./types";
import { CollaboratorRow } from "./collaborator-row";
import { InviteCollaboratorsDialog } from "./invite-collaborators-dialog";

/**
 * Collaborators table component
 */
export function CollaboratorsTable({
  collaborators,
  handleInvite,
  currentUserLogin,
}: {
  collaborators: ListLedgerCollaboratorsQuery["listLedgerCollaborators"];
  handleInvite: HandleInviteFunc;
  currentUserLogin: string | null;
}) {
  const navigate = useNavigate();
  const { ledgerOwner, ledgerName } = useParams({
    from: "/ledger/$ledgerOwner/$ledgerName/settings",
  });

  if (!ledgerOwner || !ledgerName) {
    throw new Error("Missing ledger parameters");
  }

  const ledgerId = createLedgerId(ledgerOwner, ledgerName);
  const [deleteLedgerCollaborator] = useMutation(
    DeleteLedgerCollaboratorDocument,
  );
  const [leaveLedger] = useMutation(LeaveLedgerDocument);

  const { t } = useTranslations();
  const formatError = useErrorMessage();

  const handleRemove = async (collaborator: string) => {
    try {
      await deleteLedgerCollaborator({
        variables: {
          ledgerId: ledgerId,
          collaborator: collaborator,
        },
        refetchQueries: [
          {
            query: ListLedgerCollaboratorsDocument,
            variables: {
              ledgerId: ledgerId,
            },
          },
        ],
        awaitRefetchQueries: true,
      });
      toast.success(t("collaboration.collaboratorRemovedSuccess"));
    } catch (error) {
      console.error("Error removing collaborator:", error);
      toast.error(t("collaboration.failedToRemoveCollaborator"), {
        description: formatError(error),
      });
    }
  };

  const handleExit = async () => {
    try {
      await leaveLedger({
        variables: {
          ledgerId: ledgerId,
        },
        refetchQueries: [
          {
            query: ListLedgersDocument,
            variables: {
              ledgerId: ledgerId,
            },
          },
        ],
        awaitRefetchQueries: true,
      });
      toast.success(t("collaboration.leftLedgerSuccess"));
      // Navigate away from the collaborators page after exiting
      void navigate({
        to: "/ledger",
      });
    } catch (error) {
      console.error("Error exiting repo:", error);
      toast.error(t("collaboration.failedToLeaveLedger"), {
        description: formatError(error),
      });
    }
  };

  return (
    <div className="space-y-4">
      <LedgerAdminPermission>
        <div className="flex items-center justify-end">
          <InviteCollaboratorsDialog onInvite={handleInvite} />
        </div>
      </LedgerAdminPermission>
      <div className="rounded-md border">
        <Table>
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
  );
}
