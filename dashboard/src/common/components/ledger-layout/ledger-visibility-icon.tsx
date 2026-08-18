import { Globe, Lock } from "lucide-react";
import { useTranslations } from "@/common/hooks/use-translations";
import { cn } from "@/common/lib/utils/utils";

interface LedgerVisibilityIconProps {
  isPrivate: boolean;
  className?: string;
}

/**
 * Small public/private indicator for a ledger
 * Shared by the dashboard sidebar rows and the ledger switcher
 */
export function LedgerVisibilityIcon({
  isPrivate,
  className,
}: LedgerVisibilityIconProps) {
  const { t } = useTranslations();
  const Icon = isPrivate ? Lock : Globe;
  return (
    <Icon
      className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground", className)}
      role="img"
      aria-label={
        isPrivate ? t("page.dashboard.private") : t("page.dashboard.public")
      }
    />
  );
}
