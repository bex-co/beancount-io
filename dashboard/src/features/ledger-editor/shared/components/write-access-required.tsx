import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { useTranslations } from "@/common/hooks/use-translations";
import { useIsAuthenticated } from "@/common/hooks/use-is-authenticated";

type WriteAccessRequiredProps = {
  ledgerOwner: string;
  ledgerName: string;
  /** Directory the reader came from, so the way back is where they were. */
  dirPath?: string;
};

/**
 * Stands in for a file-writing form when the reader cannot write to the ledger.
 *
 * The public directory already hides its Create File and Upload Files buttons,
 * but the routes behind them are reachable directly, which handed an anonymous
 * reader a filename field, an editor and an enabled Save for a change the API
 * would refuse. Say which of the two reasons applies and offer the readable
 * Files view instead of a form that cannot be submitted.
 */
export function WriteAccessRequired({
  ledgerOwner,
  ledgerName,
  dirPath = "",
}: WriteAccessRequiredProps) {
  const { t } = useTranslations();
  const isAuthenticated = useIsAuthenticated();

  return (
    <Card>
      <CardContent className="flex flex-col items-start gap-4 pt-6">
        <p className="text-sm text-muted-foreground">
          {isAuthenticated
            ? t("common.errors.forbidden")
            : t("common.errors.unauthenticated")}
        </p>
        <Button asChild variant="outline">
          <Link
            to="/ledger/$ledgerOwner/$ledgerName/files/tree/$branch/$"
            params={{
              ledgerOwner,
              ledgerName,
              branch: "main",
              _splat: dirPath,
            }}
          >
            {t("ledgerEditor.browseParentDirectory")}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
