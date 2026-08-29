import { Outlet, Link, useLocation, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { cn } from "@/common/lib/utils/utils";
import { useTranslations } from "@/common/hooks/use-translations";
// import { SidebarProvider } from "@/components/ui/sidebar";

/**
 * Layout header component for settings
 */
function LayoutHeader({
  onBackToDashboard,
}: {
  onBackToDashboard: () => void;
}) {
  const { t } = useTranslations();
  return (
    <header className="h-16 shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-full items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBackToDashboard}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span>{t("common.back")}</span>
          </Button>
        </div>
      </div>
    </header>
  );
}

/**
 * Navigation tabs for settings pages
 */
function TopBarNavigation() {
  const { t } = useTranslations();
  const location = useLocation();
  const currentPath = location.pathname;

  const navItems = [
    { label: t("userSettings.general"), path: "/settings/general" },
    { label: t("userSettings.sshKeys"), path: "/settings/ssh-keys" },
    { label: t("userSettings.apiKeys"), path: "/settings/api-keys" },
    { label: t("userSettings.dangerZone"), path: "/settings/danger-zone" },
  ];

  return (
    <nav className="border-b bg-background">
      <div className="flex h-12 items-center gap-6 overflow-x-auto px-4 md:px-6">
        {navItems.map((item) => {
          const isActive = currentPath === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              replace
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative h-full flex items-center text-sm font-medium transition-colors hover:text-foreground",
                isActive ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {item.label}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * Settings layout component
 * Provides consistent sidebar and header layout for all settings pages
 */
export function SettingsLayout() {
  const router = useRouter();
  // const location = useLocation();

  const handleBackToDashboard = () => {
    router.history.back();
  };

  return (
    <div className="flex h-[var(--visual-viewport-height,100vh)] w-full">
      {/* <SettingsSidebar currentPath={location.pathname} /> */}
      <main className="flex flex-1 flex-col max-w-7xl mx-auto ">
        <LayoutHeader onBackToDashboard={handleBackToDashboard} />
        <TopBarNavigation />
        <div className="flex-1 overflow-auto p-4">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
