import { Badge } from "@/common/components/ui/badge";
import { AlertCircle, Crown } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { useTranslations } from "@/common/hooks/use-translations";
import { track } from "@/common/analytics";
import { Link } from "@tanstack/react-router";
import { cn } from "@/common/lib/utils/utils";
import { useReactNativeContext } from "@/common/providers/react-native-bridge-provider/react-native-bridge-context";

interface LimitIndicatorProps {
  used: number;
  max: number;
  limitType: "ledgers" | "collaborators";
  variant?: "alert" | "badge";
}

// Lookup object for translation keys based on limit type
const LIMIT_TITLE_KEYS = {
  ledgers: {
    normal: "common.ledgersLimit",
    reached: "common.ledgersLimitReached",
  },
  collaborators: {
    normal: "common.collaboratorsLimit",
    reached: "common.collaboratorsLimitReached",
  },
} as const;

export function LimitIndicator({
  used,
  max,
  limitType,
  variant = "alert",
}: LimitIndicatorProps) {
  const { t } = useTranslations();
  const { isReactNative } = useReactNativeContext();

  // Calculate usage percentage
  const percentage = (used / max) * 100;

  // Determine badge variant based on usage
  const getBadgeVariant = () => {
    if (percentage >= 100) return "destructive";
    if (percentage >= 90) return "destructive";
    if (percentage >= 70) return "secondary";
    return "secondary";
  };

  // Determine if we should show upgrade prompt
  const isNearLimit = percentage >= 70;
  const isAtLimit = used >= max;

  if (variant === "badge") {
    return (
      <Badge variant={getBadgeVariant()} className="font-normal">
        {used} / {max} {limitType}
      </Badge>
    );
  }

  // Alert variant
  const titleKey = isAtLimit
    ? LIMIT_TITLE_KEYS[limitType].reached
    : LIMIT_TITLE_KEYS[limitType].normal;

  const Icon = isAtLimit ? Crown : AlertCircle;

  return (
    <div
      role="alert"
      className={cn(
        "relative w-full rounded-lg border px-4 py-3 text-sm mb-4 flex items-start gap-3",
        isAtLimit ? "text-destructive bg-card" : "bg-card text-card-foreground",
      )}
    >
      <Icon className="h-4 w-4 shrink-0 text-current" />
      <div className="flex-1 flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-0">
        <div className="flex-1 flex flex-col gap-0.5 min-w-0">
          <div className="font-medium tracking-tight">{t(titleKey)}</div>
          <div
            className={cn(
              "text-sm",
              isAtLimit ? "text-destructive/90" : "text-muted-foreground",
            )}
          >
            {used} / {max} {limitType}
            {isNearLimit && !isAtLimit && ` - ${t("common.nearLimit")}`}
          </div>
        </div>
        {isNearLimit && !isReactNative && (
          <Button variant="default" size="sm" asChild>
            <Link
              to="/settings/general"
              onClick={() =>
                track("upgrade_prompt_clicked", {
                  surface: `${limitType}_limit`,
                })
              }
            >
              {t("common.upgradeToUnlock")}
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
