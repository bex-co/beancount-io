import { useState } from "react";
import { Button } from "@/common/components/ui/button";
import { Label } from "@/common/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/common/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";
import { UserPlus } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/common/components/ui/alert";
import { useDiscardDraftGuard } from "@/common/components/discard-draft-guard";
import { usePendingAction } from "@/common/hooks/use-pending-action";
import { useTranslations } from "@/common/hooks/use-translations";
import { useErrorMessage } from "@/common/lib/errors/error-message";
import type { SearchUser } from "@/graphql/definitions";
import type {
  HandleInviteFunc,
  CollaboratorPermissionType,
  InviteFailure,
} from "./types";
import { MultiUserSearch } from "./multi-user-search";

/**
 * Invite collaborators dialog component
 */
export function InviteCollaboratorsDialog({
  onInvite,
}: {
  onInvite: HandleInviteFunc;
}) {
  const { t } = useTranslations();
  const formatError = useErrorMessage();
  const [open, setOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<SearchUser[]>([]);
  const [addedUsernames, setAddedUsernames] = useState<string[]>([]);
  const [failures, setFailures] = useState<InviteFailure[]>([]);
  const [selectedPermission, setSelectedPermission] =
    useState<CollaboratorPermissionType>("read");
  const { run, pending } = usePendingAction();
  const { requestLeave, confirmation } = useDiscardDraftGuard(
    selectedUsers.length > 0,
    open ? { writing: pending } : undefined,
  );

  const close = () => {
    setSelectedUsers([]);
    setAddedUsernames([]);
    setFailures([]);
    setSelectedPermission("read");
    setOpen(false);
  };

  const handleInvite = () => {
    if (!selectedUsers.length) return;
    void run(async () => {
      setFailures([]);
      const refused = await onInvite(selectedUsers, selectedPermission).catch(
        (error: unknown) => {
          const reason = formatError(error);
          return selectedUsers.map(({ username }) => ({ username, reason }));
        },
      );
      if (refused.length === 0) {
        close();
        return true;
      }
      const failedUsernames = new Set(refused.map(({ username }) => username));
      setSelectedUsers(
        selectedUsers.filter(({ username }) => failedUsernames.has(username)),
      );
      setAddedUsernames((added) => [
        ...added,
        ...selectedUsers
          .map(({ username }) => username)
          .filter((username) => !failedUsernames.has(username)),
      ]);
      setFailures(refused);
      return false;
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (next ? setOpen(true) : requestLeave(close))}
    >
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          {t("collaboration.inviteCollaborator")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" busy={pending}>
        <DialogHeader>
          <DialogTitle>{t("collaboration.inviteCollaborators")}</DialogTitle>
          <DialogDescription>
            {t("collaboration.inviteCollaboratorsDescription")}
          </DialogDescription>
        </DialogHeader>

        <fieldset className="min-w-0 py-4 space-y-4" disabled={pending}>
          <MultiUserSearch
            addedUsernames={addedUsernames}
            selectedUsers={selectedUsers}
            onUsersChange={(users) => {
              setSelectedUsers(users);
              setFailures((current) =>
                current.filter(({ username }) =>
                  users.some((user) => user.username === username),
                ),
              );
            }}
          />
          <div className="space-y-2">
            <Label htmlFor="permission-select">
              {t("collaboration.permission")}
            </Label>
            <Select
              value={selectedPermission}
              disabled={pending}
              onValueChange={(value) =>
                setSelectedPermission(value as CollaboratorPermissionType)
              }
            >
              <SelectTrigger id="permission-select" className="w-full">
                <SelectValue placeholder={t("collaboration.permission")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="read">{t("collaboration.read")}</SelectItem>
                <SelectItem value="write">
                  {t("collaboration.write")}
                </SelectItem>
                {/* <SelectItem value="admin">{t("collaboration.admin")}</SelectItem> */}
              </SelectContent>
            </Select>
          </div>
        </fieldset>

        {failures.length > 0 && (
          <Alert variant="destructive">
            <AlertTitle>
              {t("collaboration.failedToAddCollaborator")}
            </AlertTitle>
            <AlertDescription>
              <ul className="list-disc ps-4">
                {failures.map(({ username, reason }) => (
                  <li key={username}>
                    <bdi className="font-medium">{username}</bdi> {"·"} {reason}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        {confirmation}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => requestLeave(close)}
            disabled={pending}
          >
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleInvite}
            disabled={selectedUsers.length === 0}
            loading={pending}
          >
            {t("userSettings.invite")}{" "}
            {selectedUsers.length > 0 && `(${selectedUsers.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
