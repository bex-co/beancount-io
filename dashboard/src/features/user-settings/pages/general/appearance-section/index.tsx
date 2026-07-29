import { Palette } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Separator } from "@/common/components/ui/separator";
import { useTranslations } from "@/common/hooks/use-translations";
import { useReactNativeContext } from "@/common/providers/react-native-bridge-provider";
import { ThemeSwitch } from "./theme-switch";
import { LanguageSelector } from "./language-selector";

/**
 * Appearance settings section component
 * Manages theme and language preferences
 */
export function AppearanceSection() {
  const { t } = useTranslations();
  const { isReactNative } = useReactNativeContext();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          {t("userSettings.appearance")}
        </CardTitle>
        <CardDescription>
          {t("userSettings.customizeAppearance")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">{t("userSettings.theme")}</p>
            <p className="text-sm text-muted-foreground">
              {t("userSettings.selectColorTheme")}
            </p>
          </div>
          <ThemeSwitch />
        </div>
        {!isReactNative && (
          <>
            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {t("userSettings.currentLanguage")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("userSettings.selectLanguage")}
                </p>
              </div>
              <LanguageSelector />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
