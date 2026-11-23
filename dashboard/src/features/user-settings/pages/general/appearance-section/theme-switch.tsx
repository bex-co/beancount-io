import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/common/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/common/components/ui/dropdown-menu.tsx";
import { useTheme } from "@/common/hooks/use-theme";
import { useTranslations } from "@/common/hooks/use-translations.ts";
import type { Theme } from "@/common/providers/theme-provider/type";

const options = {
  light: { label: "userSettings.light", icon: Sun },
  dark: { label: "userSettings.dark", icon: Moon },
  system: { label: "userSettings.system", icon: Monitor },
} as const;

/**
 * Theme switch component using shadcn dropdown menu
 * Provides light, dark, and system theme options
 */
export function ThemeSwitch() {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslations();
  const { label, icon: ThemeIcon } = options[theme];
  const currentLabel = t(label);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          aria-label={`${t("userSettings.theme")} ${currentLabel}`}
        >
          <ThemeIcon className="h-4 w-4" aria-hidden />
          {currentLabel}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={(value) => setTheme(value as Theme)}
        >
          {Object.entries(options).map(([value, { label, icon: Icon }]) => (
            <DropdownMenuRadioItem key={value} value={value}>
              <Icon className="h-4 w-4" aria-hidden />
              <span>{t(label)}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
