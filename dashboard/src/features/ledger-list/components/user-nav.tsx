import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/common/components/ui/button";
import { Avatar, AvatarFallback } from "@/common/components/ui/avatar";
import { useQuery } from "@apollo/client/react";
import { GetCurrentUserDocument } from "@/graphql/definitions";
import { useTranslations } from "@/common/hooks/use-translations";

/**
 * User navigation dropdown component
 * Shows user info and provides access to settings and logout
 */
export function UserNav() {
  const { t } = useTranslations();
  const navigate = useNavigate();

  const { data, loading: isLoading } = useQuery(GetCurrentUserDocument);

  const user = data?.userProfile;

  const handleSettings = () => {
    void navigate({ to: "/settings" });
  };

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
        <div className="h-4 w-20 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  const username = user?.username || t("common.userFallback");
  const usernameInitial = username[0].toUpperCase();
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        className="relative h-8 w-8 rounded-full hover:bg-accent"
        onClick={handleSettings}
      >
        <Avatar className="h-8 w-8 rounded-lg">
          <AvatarFallback className="rounded-lg text-primary-foreground">
            {usernameInitial}
          </AvatarFallback>
        </Avatar>
        <div className="grid flex-1 text-left text-sm leading-tight">
          <span className="truncate font-medium text-foreground">
            {username}
          </span>
          <span className="text-muted-foreground truncate text-xs">
            {user?.email || t("common.userEmailFallback")}
          </span>
        </div>
      </Button>
    </div>
  );
}
