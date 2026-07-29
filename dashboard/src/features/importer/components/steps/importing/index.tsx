import { Card } from "@/common/components/ui/card";
import { useTranslations } from "@/common/hooks/use-translations";

/**
 * Loading state shown while transactions are being imported
 */
export function ImportingStep() {
  const { t } = useTranslations();

  return (
    <Card className="p-12">
      <div className="flex flex-col items-center space-y-6 text-center">
        {/* Animated dots */}
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
          <div className="w-3 h-3 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
          <div className="w-3 h-3 rounded-full bg-primary animate-bounce" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">
            {t("importer.importing.title")}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t("importer.importing.description")}
          </p>
        </div>
      </div>
    </Card>
  );
}
