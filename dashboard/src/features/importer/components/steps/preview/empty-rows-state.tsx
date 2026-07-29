import { FileX, RotateCcw } from "lucide-react";
import { Card, CardContent } from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { useTranslations } from "@/common/hooks/use-translations";

type EmptyRowsStateProps = {
  onRetry: () => void;
};

/**
 * Empty state component shown when file is successfully parsed but contains no rows
 */
export function EmptyRowsState({ onRetry }: EmptyRowsStateProps) {
  const { t } = useTranslations();

  return (
    <Card>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-6 mb-4">
            <FileX className="w-12 h-12 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            {t("importer.preview.emptyFileTitle")}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mb-6">
            {t("importer.preview.emptyFileDescription")}
          </p>
          <Button onClick={onRetry} variant="outline" size="lg">
            <RotateCcw className="w-4 h-4 mr-2" />
            {t("importer.preview.retryUpload")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
