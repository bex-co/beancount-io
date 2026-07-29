import { Card } from "@/common/components/ui/card";
import { Loader2 } from "lucide-react";
import { useTranslations } from "@/common/hooks/use-translations";
import type { ParseStage } from "../../../types";

interface ParsingProgressProps {
  stage: ParseStage;
  fileName: string;
}

export function ParsingProgress({ stage, fileName }: ParsingProgressProps) {
  const { t } = useTranslations();

  const getStageMessage = (stage: ParseStage): string => {
    switch (stage) {
      case "detecting":
        return t("importer.parsing.detectingFormat");
      case "client-parsing":
        return t("importer.parsing.clientParsing");
      case "server-parsing":
        return t("importer.parsing.serverParsing");
      default:
        return t("importer.parsing.processing");
    }
  };

  const getStageDescription = (stage: ParseStage): string | null => {
    switch (stage) {
      case "server-parsing":
        return t("importer.parsing.serverParsingDescription");
      case "client-parsing":
        return t("importer.parsing.clientParsingDescription");
      default:
        return null;
    }
  };

  return (
    <Card className="p-8">
      <div className="flex flex-col items-center space-y-4 text-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">{getStageMessage(stage)}</h3>
          <p className="text-sm text-muted-foreground">{fileName}</p>
          {getStageDescription(stage) && (
            <p className="text-xs text-muted-foreground mt-2">
              {getStageDescription(stage)}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
