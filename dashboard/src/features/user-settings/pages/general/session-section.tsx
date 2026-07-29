import { useNavigate } from "@tanstack/react-router";
import { Shield, LogOut } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { useTranslations } from "@/common/hooks/use-translations";

/**
 * Session management section component
 * Handles user logout functionality
 */
export function SessionSection() {
  const { t } = useTranslations();
  const navigate = useNavigate();

  const handleLogout = async () => {
    void navigate({ to: "/auth/logout" });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          {t("userSettings.session")}
        </CardTitle>
        <CardDescription>
          {t("userSettings.manageActiveSession")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-start flex-col lg:flex-row justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">{t("auth.logout")}</p>
            <p className="text-sm text-muted-foreground">
              {t("userSettings.signOutDescription")}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="shrink-0"
          >
            <LogOut className="h-4 w-4 mr-2" />
            {t("auth.logout")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
