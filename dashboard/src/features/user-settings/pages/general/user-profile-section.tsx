import { useState } from "react";
import { useMutation } from "@apollo/client/react";
import { User } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Separator } from "@/common/components/ui/separator";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
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
  GetCurrentUserDocument,
  ListLedgersDocument,
  UpdateUsernameDocument,
  UpdateProfileDocument,
  type UpdateUsernameMutation,
  type UpdateUsernameMutationVariables,
  type UpdateProfileMutation,
  type UpdateProfileMutationVariables,
  type GetCurrentUserQuery,
} from "@/graphql/definitions";
import { toast } from "sonner";
import { useTranslations } from "@/common/hooks/use-translations";
import { useErrorMessage } from "@/common/lib/errors/error-message";

interface UserProfileSectionProps {
  userData: GetCurrentUserQuery | undefined;
}

/**
 * User profile section component
 * Displays and allows editing of user profile information
 */
export function UserProfileSection({ userData }: UserProfileSectionProps) {
  const { t } = useTranslations();
  const formatError = useErrorMessage();
  const [isUsernameDialogOpen, setIsUsernameDialogOpen] = useState(false);
  const [isNameDialogOpen, setIsNameDialogOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");

  const [updateUsername, { loading: updatingUsername }] = useMutation<
    UpdateUsernameMutation,
    UpdateUsernameMutationVariables
  >(UpdateUsernameDocument, {
    onCompleted: () => {
      toast.success(t("userSettings.usernameUpdatedSuccess"));
      setIsUsernameDialogOpen(false);
      setNewUsername("");
    },
    onError: (err) => {
      toast.error(formatError(err));
    },
    refetchQueries: [
      { query: GetCurrentUserDocument },
      { query: ListLedgersDocument },
    ],
  });

  const [updateProfile, { loading: updatingProfile }] = useMutation<
    UpdateProfileMutation,
    UpdateProfileMutationVariables
  >(UpdateProfileDocument, {
    onCompleted: () => {
      toast.success(t("page.dashboard.ledgerUpdatedSuccess"));
      setIsNameDialogOpen(false);
      setNewFirstName("");
      setNewLastName("");
    },
    onError: (err) => {
      toast.error(formatError(err));
    },
    refetchQueries: [
      { query: GetCurrentUserDocument },
      { query: ListLedgersDocument },
    ],
  });

  const handleUpdateUsername = () => {
    if (!newUsername.trim()) {
      toast.error(t("auth.usernameRequired"));
      return;
    }
    void updateUsername({ variables: { username: newUsername.trim() } });
  };

  const handleUpdateName = () => {
    void updateProfile({
      variables: {
        firstName: newFirstName.trim(),
        lastName: newLastName.trim(),
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          {t("userSettings.userProfile")}
        </CardTitle>
        <CardDescription>
          {t("userSettings.yourAccountInformation")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Name */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">{t("userSettings.name")}</p>
            <p className="text-sm text-muted-foreground">
              {userData?.userProfile?.firstName ||
              userData?.userProfile?.lastName
                ? `${userData?.userProfile?.firstName || ""} ${userData?.userProfile?.lastName || ""}`.trim()
                : t("userSettings.notSet")}
            </p>
          </div>
          <Dialog open={isNameDialogOpen} onOpenChange={setIsNameDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setNewFirstName(userData?.userProfile?.firstName || "");
                  setNewLastName(userData?.userProfile?.lastName || "");
                }}
              >
                {t("common.edit")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("userSettings.changeName")}</DialogTitle>
                <DialogDescription>
                  {t("userSettings.enterNewName")}
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="firstName" className="text-sm font-medium">
                      {t("userSettings.firstName")}
                    </label>
                    <Input
                      id="firstName"
                      value={newFirstName}
                      onChange={(e) => setNewFirstName(e.target.value)}
                      placeholder={t("auth.enterFirstName")}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleUpdateName();
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="lastName" className="text-sm font-medium">
                      {t("userSettings.lastName")}
                    </label>
                    <Input
                      id="lastName"
                      value={newLastName}
                      onChange={(e) => setNewLastName(e.target.value)}
                      placeholder={t("auth.enterLastName")}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleUpdateName();
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsNameDialogOpen(false)}
                  disabled={updatingProfile}
                >
                  {t("common.cancel")}
                </Button>
                <Button onClick={handleUpdateName} disabled={updatingProfile}>
                  {updatingProfile ? t("common.updating") : t("common.save")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Separator />

        {/* Username */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">{t("auth.username")}</p>
            <p className="text-sm text-muted-foreground">
              {userData?.userProfile?.username || t("userSettings.notSet")}
            </p>
          </div>
          <Dialog
            open={isUsernameDialogOpen}
            onOpenChange={setIsUsernameDialogOpen}
          >
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setNewUsername(userData?.userProfile?.username || "")
                }
              >
                {t("common.edit")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("userSettings.changeUsername")}</DialogTitle>
                <DialogDescription>
                  {t("userSettings.enterNewUsername")}
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Input
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder={t("userSettings.enterNewUsernamePlaceholder")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleUpdateUsername();
                    }
                  }}
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsUsernameDialogOpen(false)}
                  disabled={updatingUsername}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  onClick={handleUpdateUsername}
                  disabled={updatingUsername}
                >
                  {updatingUsername ? t("common.updating") : t("common.save")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Separator />

        {/* Email */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">{t("auth.email")}</p>
            <p className="text-sm text-muted-foreground">
              {userData?.userProfile?.email}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
