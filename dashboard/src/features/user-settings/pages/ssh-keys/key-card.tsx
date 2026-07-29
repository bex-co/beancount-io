import { Key } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { Badge } from "@/common/components/ui/badge";
import { Card, CardContent } from "@/common/components/ui/card";
import { KeyDeleteDialog } from "./key-delete-dialog";
import { type PublicKey } from "@/graphql/definitions";
import { formatDateISO } from "@/common/lib/format/format-date-iso";
import { useTranslations } from "@/common/hooks/use-translations";

interface KeyCardProps {
  keyData: PublicKey;
}

/**
 * Component to display individual SSH key information in a card format
 */
export function KeyCard({ keyData }: KeyCardProps) {
  const { t } = useTranslations();

  const getLastUsedStatus = () => {
    if (!keyData.lastUsedAt) {
      return {
        text: t("userSettings.neverUsed"),
        color: "text-muted-foreground",
        variant: "secondary" as const,
      };
    }

    const lastUsed = new Date(keyData.lastUsedAt);
    const now = new Date();
    const daysSinceLastUse = Math.floor(
      (now.getTime() - lastUsed.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysSinceLastUse <= 7) {
      return {
        text: t("userSettings.lastUsedWeek"),
        color: "text-green-600",
        variant: "secondary" as const,
      };
    } else if (daysSinceLastUse <= 21) {
      return {
        text: t("userSettings.lastUsed3Weeks"),
        color: "text-muted-foreground",
        variant: "secondary" as const,
      };
    } else if (daysSinceLastUse <= 90) {
      return {
        text: t("userSettings.lastUsed3Months"),
        color: "text-muted-foreground",
        variant: "secondary" as const,
      };
    } else {
      return {
        text: t("userSettings.lastUsedLongAgo"),
        color: "text-muted-foreground",
        variant: "outline" as const,
      };
    }
  };

  const lastUsedStatus = getLastUsedStatus();
  const isRecentlyUsed = lastUsedStatus.color === "text-green-600";

  return (
    <Card className="hover:shadow-md p-6 transition-shadow duration-200">
      <CardContent className="p-0">
        <div className="flex items-start gap-3">
          {/* Key Icon */}
          <div className="shrink-0">
            <div
              className={`p-1.5 rounded-md ${isRecentlyUsed ? "bg-green-100" : "bg-muted"}`}
            >
              <Key
                className={`h-4 w-4 ${isRecentlyUsed ? "text-green-600" : "text-muted-foreground"}`}
              />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-1.5">
            {/* Key Name */}
            <h3 className="text-base font-semibold text-foreground leading-tight">
              {keyData.title}
            </h3>

            {/* SHA256 Hash */}
            <span className="hidden sm:block text-xs text-muted-foreground font-mono rounded truncate">
              fingerprint:{keyData.fingerprint}
            </span>

            {/* Added Date and Status */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
              <p className="text-xs text-muted-foreground">
                {t("userSettings.added")} {formatDateISO(keyData.createdAt)}
              </p>
              <span className="hidden sm:inline text-muted-foreground">•</span>
              <Badge variant={lastUsedStatus.variant} className="text-xs w-fit">
                {lastUsedStatus.text}
              </Badge>
            </div>
          </div>

          {/* Delete Button */}
          <div className="shrink-0">
            <KeyDeleteDialog keyData={keyData}>
              <Button variant="destructive" size="sm" className="h-8">
                {t("common.delete")}
              </Button>
            </KeyDeleteDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
