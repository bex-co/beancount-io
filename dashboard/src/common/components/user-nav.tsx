import { useNavigate } from "@tanstack/react-router";
import {
  LogOut,
  Settings,
  Palette,
  Sun,
  Moon,
  Monitor,
  Globe,
  Star,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/common/components/ui/dropdown-menu.tsx";

import { useQuery } from "@apollo/client/react";
import { GetCurrentUserDocument } from "@/graphql/definitions.ts";
import { useTheme } from "@/common/hooks/use-theme";
import { useTranslations } from "@/common/hooks/use-translations.ts";
import { useIsMobile } from "@/common/hooks/use-mobile";
import { Button } from "@/common/components/ui/button.tsx";
import { Avatar, AvatarFallback } from "@/common/components/ui/avatar.tsx";
import {
  SUPPORTED_LANGUAGES,
  LANGUAGE_NAMES,
  type SupportedLanguage,
  persistLanguage,
} from "@/i18n";

interface UserAvatarButtonProps {
  userInitial: string;
  onClick?: () => void;
}

/**
 * Reusable user avatar button component
 * Displays a circular avatar button with user initial
 */
export function UserAvatarButton({
  userInitial,
  onClick,
  ...props
}: UserAvatarButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={onClick}
      {...props}
      className="relative rounded-full hover:bg-accent p-0"
    >
      <Avatar className="h-8 w-8">
        <AvatarFallback>{userInitial}</AvatarFallback>
      </Avatar>
    </Button>
  );
}

/**
 * User navigation dropdown component for ledger layout
 * Shows user avatar and provides access to settings and logout
 */
export function UserNav() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { t, i18n } = useTranslations();
  const isMobile = useIsMobile();

  const { data, loading: isLoading } = useQuery(GetCurrentUserDocument);

  const user = data?.userProfile;

  const handleLogout = async () => {
    void navigate({ to: "/auth/logout" });
  };

  const handleSettings = () => {
    void navigate({ to: "/settings" });
  };

  const handleStars = () => {
    if (user?.username) {
      void navigate({
        to: "/ledger/$username",
        params: { username: user.username },
        search: { tab: "starred" },
      });
    }
  };

  const getThemeLabel = () => {
    switch (theme) {
      case "light":
        return t("userSettings.themeLight");
      case "dark":
        return t("userSettings.themeDark");
      case "system":
        return t("userSettings.themeSystem");
      default:
        return t("userSettings.themeSystem");
    }
  };

  const getCurrentLanguage = (): SupportedLanguage => {
    const currentLang = i18n.language?.split("-")[0] || "en";
    return SUPPORTED_LANGUAGES.includes(currentLang as SupportedLanguage)
      ? (currentLang as SupportedLanguage)
      : "en";
  };

  const getLanguageLabel = () => {
    return LANGUAGE_NAMES[getCurrentLanguage()];
  };

  const handleLanguageChange = (lang: SupportedLanguage) => {
    void i18n.changeLanguage(lang);
    persistLanguage(lang);
  };

  if (isLoading) {
    return <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />;
  }

  const userInitial = user?.username?.[0]?.toUpperCase() || "U";

  // On mobile, show a simple button that navigates to settings
  if (isMobile) {
    return (
      <UserAvatarButton userInitial={userInitial} onClick={handleSettings} />
    );
  }

  // On desktop, show the full dropdown menu
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <UserAvatarButton userInitial={userInitial} />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {user?.username || t("common.userFallback")}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.email || t("common.userEmailFallback")}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSettings}>
          <Settings className="mr-2 h-4 w-4" />
          <span>{t("common.settings")}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleStars}>
          <Star className="mr-2 h-4 w-4" />
          <span>{t("common.stars")}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Palette className="mr-2 h-4 w-4" />
            <div className="flex flex-col">
              <span>{t("userSettings.theme")}</span>
              <span className="text-xs text-muted-foreground">
                {getThemeLabel()}
              </span>
            </div>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem
              onClick={() => setTheme("light")}
              className={theme === "light" ? "bg-accent" : ""}
            >
              <Sun className="mr-2 h-4 w-4" />
              <span>{t("userSettings.themeLight")}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setTheme("dark")}
              className={theme === "dark" ? "bg-accent" : ""}
            >
              <Moon className="mr-2 h-4 w-4" />
              <span>{t("userSettings.themeDark")}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setTheme("system")}
              className={theme === "system" ? "bg-accent" : ""}
            >
              <Monitor className="mr-2 h-4 w-4" />
              <span>{t("userSettings.themeSystem")}</span>
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Globe className="mr-2 h-4 w-4" />
            <div className="flex flex-col">
              <span>{t("userSettings.currentLanguage")}</span>
              <span className="text-xs text-muted-foreground">
                {getLanguageLabel()}
              </span>
            </div>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isCurrent = getCurrentLanguage() === lang;
              return (
                <DropdownMenuItem
                  key={lang}
                  onClick={() => handleLanguageChange(lang)}
                  className={isCurrent ? "bg-accent" : ""}
                >
                  <span>{LANGUAGE_NAMES[lang]}</span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} variant="destructive">
          <LogOut className="mr-2 h-4 w-4" />
          <span>{t("auth.logout")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
