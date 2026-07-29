import { useEffect, useRef } from "react";
import { Alert, AlertDescription } from "@/common/components/ui/alert";
import { Button } from "@/common/components/ui/button";
import { ChevronRight, Trash2 } from "lucide-react";
import { List } from "react-window";
import { cn } from "@/common/lib/utils/utils";
import { parseQueryChart } from "../lib/chart-utils";
import { QueryResultChart } from "./query-result-chart";
import { QueryResultExport } from "./query-result-export";
import type { QueryShellQuery } from "@/graphql/definitions";
import { useTranslations } from "@/common/hooks/use-translations";
import { getErrorMessageKey } from "@/common/lib/errors/error-message";

const ROW_HEIGHT = 36;
const CONTAINER_HEIGHT = 600;

interface QueryResultCardProps {
  query: string;
  result: QueryShellQuery["queryShell"] | null;
  error?: Error | null;
  loading?: boolean;
  isInitiallyOpen?: boolean;
  onExecute: (query: string) => void;
  onDelete: (query: string) => void;
}

export function QueryResultCard({
  query,
  result,
  error,
  loading,
  isInitiallyOpen = false,
  onExecute,
  onDelete,
}: QueryResultCardProps) {
  const { t } = useTranslations();
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (detailsRef.current && isInitiallyOpen) {
      detailsRef.current.open = true;
    }
  }, [isInitiallyOpen]);

  const handleToggle = () => {
    const isOpen = detailsRef.current?.open || false;
    // If opening and no result yet, execute the query
    if (isOpen && !result && !error && !loading) {
      onExecute(query);
    }
  };

  const renderTableData = () => {
    if (!result?.table) return null;

    const { table } = result;
    const headers = table.types?.map((type) => type.name) || [];
    const rows = table.rows || [];

    if (rows.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          {t("page.bql.noDataReturnedFromQuery")}
        </div>
      );
    }

    return (
      <div>
        <div className="mb-2 text-sm text-muted-foreground">
          {t("bql.rowCount", { count: rows.length })}
        </div>
        <div className="overflow-x-auto border rounded-lg">
          {/* Sticky header */}
          <div className="flex border-b bg-muted/50 font-medium text-sm">
            {headers.map((header) => (
              <div
                key={header}
                className="min-w-[120px] flex-shrink-0 flex-1 px-2 sm:px-3 py-1.5 sm:py-2"
              >
                {header}
              </div>
            ))}
          </div>
          {/* Virtualized body */}
          <List<{ rows: typeof rows }>
            rowCount={rows.length}
            rowHeight={ROW_HEIGHT}
            rowProps={{ rows }}
            style={{
              height: Math.min(rows.length * ROW_HEIGHT, CONTAINER_HEIGHT),
              width: "100%",
            }}
            rowComponent={({ index, style, ...rowProps }) => {
              const row = (rowProps as unknown as { rows: typeof rows }).rows[
                index
              ];
              return (
                <div style={style} className="flex border-b last:border-b-0">
                  {row.map((cell, cellIndex) => (
                    <div
                      key={cellIndex}
                      className="min-w-[120px] flex-shrink-0 flex-1 px-2 sm:px-3 py-1.5 sm:py-2 text-sm truncate"
                    >
                      {typeof cell === "object" && cell !== null
                        ? JSON.stringify(cell)
                        : String(cell ?? "")}
                    </div>
                  ))}
                </div>
              );
            }}
          />
        </div>
      </div>
    );
  };

  const renderTextData = () => {
    if (!result?.text) return null;

    return (
      <div className="space-y-2">
        <h4 className="font-medium">{t("page.bql.queryResult")}:</h4>
        <pre className="bg-muted p-4 rounded-md overflow-auto text-sm max-h-96">
          {result.text.contents}
        </pre>
      </div>
    );
  };

  const chartConfig = result?.table ? parseQueryChart(result.table) : null;

  return (
    <details
      ref={detailsRef}
      onToggle={handleToggle}
      className={cn(
        "border rounded-lg overflow-hidden group",
        error && "border-destructive",
      )}
    >
      <summary className="flex items-start gap-2 p-3 hover:bg-muted/50 transition-colors cursor-pointer list-none">
        <ChevronRight
          className={cn(
            "h-5 w-5 shrink-0 transition-transform mt-0.5",
            "group-open:rotate-90",
          )}
        />
        <div className="flex-1 text-left">
          <pre className="text-sm font-mono whitespace-pre-wrap break-words">
            {query}
          </pre>
        </div>
        <div
          className="flex items-center gap-1 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {result?.table && (
            <QueryResultExport result={result.table} queryString={query} />
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(query)}
            className="gap-2"
            title={t("bql.deleteQuery")}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </summary>

      <div className="border-t p-4 space-y-4">
        {loading && (
          <div className="text-center py-8 text-muted-foreground">
            {t("bql.executing")}...
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{t(getErrorMessageKey(error))}</AlertDescription>
          </Alert>
        )}

        {result && !loading && (
          <>
            {chartConfig && (
              <div className="mb-4">
                <QueryResultChart chartConfig={chartConfig} />
              </div>
            )}

            {result.resultType === "table" && renderTableData()}
            {result.resultType === "text" && renderTextData()}
            {result.resultType !== "table" && result.resultType !== "text" && (
              <div className="text-center py-8 text-muted-foreground">
                {t("page.bql.unknownResultType")}: {result.resultType}
              </div>
            )}
          </>
        )}
      </div>
    </details>
  );
}
