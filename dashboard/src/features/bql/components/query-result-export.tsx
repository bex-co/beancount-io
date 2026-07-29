import { Download } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { exportQueryResultAsCSV } from "../lib/export-utils";
import type { QueryResultTable } from "@/graphql/definitions";
import { useTranslations } from "@/common/hooks/use-translations";

interface QueryResultExportProps {
  result: QueryResultTable;
  queryString: string;
}

export function QueryResultExport({
  result,
  queryString,
}: QueryResultExportProps) {
  const { t } = useTranslations();

  const handleExport = () => {
    exportQueryResultAsCSV(result, queryString);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleExport}
      className="gap-2"
      title={t("bql.downloadCSV")}
    >
      <Download className="h-4 w-4" />
      <span className="hidden sm:inline">{t("bql.downloadCSV")}</span>
    </Button>
  );
}
