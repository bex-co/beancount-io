import { Link } from "@tanstack/react-router";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/common/components/ui/card";
import { Badge } from "@/common/components/ui/badge";
import { Star } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useTranslations } from "@/common/hooks/use-translations";

interface RepositoryListItemProps {
  name: string;
  fullName: string;
  description?: string | null;
  isPrivate: boolean;
  updatedAt: Date | string;
  starsCount?: number | null;
  ownerUsername: string;
}

export function RepositoryListItem({
  name,
  description,
  isPrivate,
  updatedAt,
  starsCount,
  ownerUsername,
}: RepositoryListItemProps) {
  const { t } = useTranslations();

  return (
    <Link
      to="/ledger/$ledgerOwner/$ledgerName"
      params={{ ledgerOwner: ownerUsername, ledgerName: name }}
    >
      <Card className="cursor-pointer hover:border-foreground/20 transition-colors">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">{name}</CardTitle>
        </CardHeader>
        {description && (
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground mb-2">{description}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={isPrivate ? "destructive" : "secondary"}>
                {isPrivate ? t("userProfile.private") : t("userProfile.public")}
              </Badge>
              {starsCount != null && starsCount > 0 && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Star className="size-3" />
                  {starsCount}
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {t("userProfile.updated")}{" "}
                {formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}
              </span>
            </div>
          </CardContent>
        )}
      </Card>
    </Link>
  );
}
