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
import { useTranslations } from "@/common/hooks/use-translations";
import type { SearchUser } from "@/graphql/definitions";
import type { HandleInviteFunc, CollaboratorPermissionType } from "./types";
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
  const [open, setOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<SearchUser[]>([]);
  const [selectedPermission, setSelectedPermission] =
    useState<CollaboratorPermissionType>("read");
  const [isLoading, setIsLoading] = useState(false);

  const handleInvite = async () => {
    try {
      setIsLoading(true);
      await onInvite(selectedUsers, selectedPermission);
      setSelectedUsers([]);
      setSelectedPermission("read");
      setOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setSelectedUsers([]);
    setSelectedPermission("read");
    setOpen(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset state when dialog closes
      setSelectedUsers([]);
      setSelectedPermission("read");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          {t("collaboration.inviteCollaborator")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("collaboration.inviteCollaborators")}</DialogTitle>
          <DialogDescription>
            {t("collaboration.inviteCollaboratorsDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <MultiUserSearch
            selectedUsers={selectedUsers}
            onUsersChange={setSelectedUsers}
          />
          <div className="space-y-2">
            <Label htmlFor="permission-select">
              {t("collaboration.permission")}
            </Label>
            <Select
              value={selectedPermission}
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleInvite}
            disabled={selectedUsers.length === 0}
            loading={isLoading}
          >
            {t("userSettings.invite")}{" "}
            {selectedUsers.length > 0 && `(${selectedUsers.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
