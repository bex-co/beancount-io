import { useState, useEffect } from "react";
import { AlertCircle, CheckCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/common/components/ui/table";
import { Badge } from "@/common/components/ui/badge";
import { useTranslations } from "@/common/hooks/use-translations";
import { EditablePreviewRow } from "./editable-preview-row";
import type { ParsedRow, CSVParseResult } from "../../../types";

interface ImportPreviewTableProps {
  result: CSVParseResult;
  onResultChange?: (result: CSVParseResult) => void;
}

export function ImportPreviewTable({
  result,
  onResultChange,
}: ImportPreviewTableProps) {
  const { t } = useTranslations();
  const [editableRows, setEditableRows] = useState<ParsedRow[]>(result.rows);

  // Update local state when result prop changes (e.g., new file uploaded)
  // This is necessary to sync external state with internal editable state
  useEffect(() => {
    setEditableRows(result.rows); // eslint-disable-line react-hooks/set-state-in-effect
  }, [result.rows]);

  // Calculate counts from current editable rows
  const validCount = editableRows.filter(
    (row) => !row.errors || row.errors.length === 0,
  ).length;
  const errorCount = editableRows.filter(
    (row) => row.errors && row.errors.length > 0,
  ).length;
  const hasErrors = errorCount > 0;

  const handleRowChange = (index: number, updatedRow: ParsedRow) => {
    const newRows = [...editableRows];
    newRows[index] = updatedRow;
    setEditableRows(newRows);

    // Notify parent of changes
    if (onResultChange) {
      const newValidCount = newRows.filter(
        (row) => !row.errors || row.errors.length === 0,
      ).length;
      const newErrorCount = newRows.filter(
        (row) => row.errors && row.errors.length > 0,
      ).length;

      onResultChange({
        rows: newRows,
        validCount: newValidCount,
        errorCount: newErrorCount,
        hasErrors: newErrorCount > 0,
      });
    }
  };

  const handleRowDelete = (index: number) => {
    const newRows = editableRows.filter((_, i) => i !== index);
    setEditableRows(newRows);

    // Notify parent of changes
    if (onResultChange) {
      const newValidCount = newRows.filter(
        (row) => !row.errors || row.errors.length === 0,
      ).length;
      const newErrorCount = newRows.filter(
        (row) => row.errors && row.errors.length > 0,
      ).length;

      onResultChange({
        rows: newRows,
        validCount: newValidCount,
        errorCount: newErrorCount,
        hasErrors: newErrorCount > 0,
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t("importer.preview.title")}</CardTitle>
            <CardDescription>
              {t("importer.preview.description")}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-primary" />
              {validCount} {t("importer.preview.validCount")}
            </Badge>
            {errorCount > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errorCount} {t("importer.preview.errorsCount")}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">
                  {t("importer.preview.row")}
                </TableHead>
                <TableHead className="w-[120px] pl-4">
                  {t("importer.preview.date")}
                </TableHead>
                <TableHead className="w-[150px] pl-4">
                  {t("importer.preview.payee")}
                </TableHead>
                <TableHead className="pl-4">
                  {t("importer.preview.description_column")}
                </TableHead>
                <TableHead className="w-[120px] text-right">
                  {t("importer.preview.amount")}
                </TableHead>
                <TableHead className="w-[80px]">
                  {t("importer.preview.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {editableRows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground"
                  >
                    {t("importer.preview.noData")}
                  </TableCell>
                </TableRow>
              ) : (
                editableRows.map((row, index) => (
                  <EditablePreviewRow
                    key={index}
                    row={row}
                    index={index}
                    onChange={handleRowChange}
                    onDelete={handleRowDelete}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {hasErrors && (
          <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-destructive">
                  {t("importer.preview.validationErrorsTitle")}
                </p>
                <p className="text-destructive/80 mt-1">
                  {t("importer.preview.validationErrorsMessage")}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
