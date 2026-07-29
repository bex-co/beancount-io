import { FileText } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { useTranslations } from "@/common/hooks/use-translations";

interface FileLoadingViewProps {
  filename: string;
}

interface FileErrorViewProps {
  filename: string;
}

/**
 * Loading view component for file content
 */
export const FileLoadingView = ({ filename }: FileLoadingViewProps) => {
  const { t } = useTranslations();
  return (
    <div>
      <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2 mb-4">
        <FileText className="h-5 w-5" />
        {filename}
      </h2>
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {t("ledgerEditor.loadingFileContent")}
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * Error view component for file content
 */
export const FileErrorView = ({ filename }: FileErrorViewProps) => {
  const { t } = useTranslations();
  return (
    <div>
      <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2 mb-4">
        <FileText className="h-5 w-5" />
        {filename}
      </h2>
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <p className="text-destructive mb-4">
            {t("ledgerEditor.failedToLoadFileContent")}
          </p>
          <Button onClick={() => window.location.reload()}>
            {t("common.tryAgain")}
          </Button>
        </div>
      </div>
    </div>
  );
};
