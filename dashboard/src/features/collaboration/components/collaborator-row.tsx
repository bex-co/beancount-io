import { useState } from "react";
import { TableCell, TableRow } from "@/common/components/ui/table";
import { Button } from "@/common/components/ui/button";
import { Badge } from "@/common/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/common/components/ui/dialog";
import { User, UserMinus, Shield, LogOut } from "lucide-react";
import type { ListLedgerCollaboratorsQuery } from "@/graphql/definitions";
import { formatDateISO } from "@/common/lib/format/format-date-iso";
import { useTranslations } from "@/common/hooks/use-translations";
import { LedgerAdminPermission } from "@/common/components/ledger-permission/admin";
import { useLedgerPermission } from "@/common/hooks/use-ledger-permission";

/**
 * Remove collaborator confirmation dialog component
 */
function RemoveCollaboratorDialog({
  collaborator,
  onConfirm,
}: {
  collaborator: ListLedgerCollaboratorsQuery["listLedgerCollaborators"][0];
  onConfirm: () => Promise<void>;
}) {
  const { t } = useTranslations();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    try {
      setIsLoading(true);
      await onConfirm();
      setOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
        >
          <UserMinus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("collaboration.removeCollaborator")}</DialogTitle>
          <DialogDescription>
            {t("collaboration.removeCollaboratorConfirmationPrefix")}{" "}
            <strong>
              {collaborator.fullName ||
                collaborator.login ||
                t("collaboration.thisUser")}
            </strong>{" "}
            {t("collaboration.removeCollaboratorConfirmationSuffix")}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            loading={isLoading}
          >
            {t("collaboration.removeCollaborator")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LeaveLedgerDialog({ onConfirm }: { onConfirm: () => Promise<void> }) {
  const { t } = useTranslations();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    try {
      setIsLoading(true);
      await onConfirm();
      setOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("collaboration.leaveLedger")}</DialogTitle>
          <DialogDescription>
            {t("collaboration.leaveLedgerConfirmation")}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            loading={isLoading}
          >
            {t("collaboration.confirmLeave")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Collaborator row component
 */
export function CollaboratorRow({
  collaborator,
  onRemove,
  currentUserLogin,
  onExit,
}: {
  collaborator: ListLedgerCollaboratorsQuery["listLedgerCollaborators"][0];
  onRemove: (collaboratorId: string) => Promise<void>;
  currentUserLogin: string | null;
  onExit: () => Promise<void>;
}) {
  const { t } = useTranslations();
  const { isAdmin } = useLedgerPermission();

  const formatCreated = (created: string | null) => {
    if (!created) return t("common.unknown");
    return formatDateISO(created) || t("common.unknown");
  };

  const getPermissionLabel = (permission: string | null) => {
    if (!permission) return t("collaboration.read");
    switch (permission) {
      case "read":
        return t("collaboration.read");
      case "write":
        return t("collaboration.write");
      case "admin":
        return t("collaboration.admin");
      default:
        return permission;
    }
  };

  const isCurrentUser =
    currentUserLogin && collaborator.login === currentUserLogin;

  return (
    <TableRow>
      <TableCell className="flex items-center space-x-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
          <User className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-medium text-muted-foreground">
              {collaborator.fullName ||
                collaborator.login ||
                t("collaboration.unknownUser")}
            </span>
            {collaborator.isAdmin && (
              <Badge variant="secondary" className="text-xs">
                <Shield className="h-3 w-3 mr-1" />
                {t("collaboration.admin")}
              </Badge>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {collaborator.email || t("collaboration.noEmail")}
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {formatCreated(collaborator.created)}
        </div>
      </TableCell>
      <TableCell>
        <Badge
          variant={
            collaborator.permission === "admin"
              ? "default"
              : collaborator.permission === "write"
                ? "secondary"
                : "outline"
          }
          className="text-xs"
        >
          {getPermissionLabel(collaborator.permission)}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <LedgerAdminPermission>
          <RemoveCollaboratorDialog
            collaborator={collaborator}
            onConfirm={async () => {
              if (collaborator.login) {
                await onRemove(collaborator.login);
              }
            }}
          />
        </LedgerAdminPermission>
        {!isAdmin && isCurrentUser && <LeaveLedgerDialog onConfirm={onExit} />}
      </TableCell>
    </TableRow>
  );
}
