/**
 * EditablePreviewRow - Row component with inline editing capability
 * Integrates React Hook Form with EditableCell components
 */

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Trash2 } from "lucide-react";
import { TableRow, TableCell } from "@/common/components/ui/table";
import { Button } from "@/common/components/ui/button";
import { useTranslations } from "@/common/hooks/use-translations";
import { EditableCell } from "./editable-cell";
import {
  createEditableRowSchema,
  type EditableRowData,
  type ImporterValidationKey,
} from "../../../utils/row-edit-schema";
import { buildParsedRow, parseAmount } from "../../../utils/csv-validator";
import { formatImportDateForDisplay } from "../../../utils/format-import-date";
import type { ParsedRow } from "../../../types";

interface EditablePreviewRowProps {
  row: ParsedRow;
  index: number;
  onChange: (index: number, data: ParsedRow) => void;
  onDelete: (index: number) => void;
}

export function EditablePreviewRow({
  row,
  index,
  onChange,
  onDelete,
}: EditablePreviewRowProps) {
  const { t, i18n } = useTranslations();
  const form = useForm<EditableRowData>({
    // react-hook-form reads the resolver on every render, so an amount edit
    // that drops `decimalMixed` validates with the rebuilt row's rule.
    resolver: zodResolver(
      createEditableRowSchema({
        decimalComma: row.decimalComma,
        decimalMixed: row.decimalMixed,
      }),
    ),
    defaultValues: {
      date: row.date,
      payee: row.payee,
      description: row.description,
      amount: row.amountInput,
    },
    mode: "onBlur",
  });
  const {
    control,
    formState: { errors },
    getValues,
    setValue,
    trigger,
  } = form;

  // Validate once per row identity so a row that arrived from the parser with
  // errors shows the same diagnostics as an edited one. `trigger()` only fills
  // formState.errors — it does not move focus — so mounting stays quiet.
  useEffect(() => {
    void trigger();
  }, [row.id, row.decimalComma, row.decimalMixed, trigger]);

  // A wrong-width record is refused whatever its cells say (w4/972).
  const malformed = Boolean(row.structuralError);
  const hasErrors = malformed || Object.keys(errors).length > 0;
  // The value an amount imports as, shown when the bank's spelling differs
  // (`-4,50` is -4.50, comma-column `-1.000` is -1000); the cell still edits
  // the raw token.
  const amountReading = (value: string) => {
    if (row.decimalMixed) return undefined;
    const parsed = parseAmount(value, { decimalComma: row.decimalComma });
    return parsed.valid && parsed.decimal !== value.trim()
      ? parsed.decimal
      : undefined;
  };
  const validationMessage = (message?: string) =>
    message ? t(message as ImporterValidationKey) : undefined;

  const handleFieldChange = async (
    field: keyof EditableRowData,
    value: string,
  ) => {
    setValue(field, value, { shouldValidate: false });
    // Revalidate the entire row — field-scoped trigger would drop diagnostics
    // on untouched invalid date/amount cells.
    await trigger();
    const values = getValues();
    const rebuilt = buildParsedRow(
      {
        id: row.id,
        date: values.date,
        payee: values.payee,
        description: values.description,
        amountInput: values.amount,
      },
      {
        decimalComma: row.decimalComma,
        // A new amount is re-read on its own; editing another field keeps
        // a mixed column's refusal.
        decimalMixed: field === "amount" ? false : row.decimalMixed,
      },
    );
    // A record of the wrong width stays refused: its four cells can all be
    // valid while the field they dropped is still unresolved (w4/972).
    onChange(
      index,
      row.structuralError
        ? {
            ...rebuilt,
            structuralError: row.structuralError,
            errors: [row.structuralError, ...(rebuilt.errors ?? [])],
          }
        : rebuilt,
    );
  };

  return (
    <>
      <TableRow
        className={hasErrors ? "bg-destructive/10 hover:bg-destructive/20" : ""}
      >
        <TableCell className="font-medium text-muted-foreground">
          {index + 1}
        </TableCell>

        {/* Date Field */}
        <TableCell>
          <Controller
            name="date"
            control={control}
            render={({ field }) => (
              <EditableCell
                label={t("importer.preview.date")}
                rowNumber={index + 1}
                value={field.value}
                displayValue={formatImportDateForDisplay(
                  field.value,
                  i18n.language,
                )}
                onChange={(value) => {
                  field.onChange(value);
                  void handleFieldChange("date", value);
                }}
                onBlur={field.onBlur}
                error={validationMessage(errors.date?.message)}
                placeholder={t("importer.preview.dateFormat")}
                type="text"
              />
            )}
          />
        </TableCell>

        {/* Payee Field */}
        <TableCell>
          <Controller
            name="payee"
            control={control}
            render={({ field }) => (
              <EditableCell
                label={t("importer.preview.payee")}
                rowNumber={index + 1}
                value={field.value}
                onChange={(value) => {
                  field.onChange(value);
                  void handleFieldChange("payee", value);
                }}
                onBlur={field.onBlur}
                error={validationMessage(errors.payee?.message)}
                placeholder={t("importer.preview.payeePlaceholder")}
                // A quoted CSV payee may hold a newline too; a single-line
                // input dropped it on the first typed edit (w4/1023).
                multiline
              />
            )}
          />
        </TableCell>

        {/* Description Field */}
        <TableCell>
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <EditableCell
                label={t("importer.preview.description_column")}
                rowNumber={index + 1}
                value={field.value}
                onChange={(value) => {
                  field.onChange(value);
                  void handleFieldChange("description", value);
                }}
                onBlur={field.onBlur}
                error={validationMessage(errors.description?.message)}
                placeholder={t("importer.preview.descriptionPlaceholder")}
                // Quoted CSV descriptions may contain newlines; a single-line
                // input would strip them on edit.
                multiline
              />
            )}
          />
        </TableCell>

        {/* Amount Field */}
        <TableCell className="text-right">
          <Controller
            name="amount"
            control={control}
            render={({ field }) => (
              <EditableCell
                label={t("importer.preview.amount")}
                rowNumber={index + 1}
                value={field.value}
                displayValue={amountReading(field.value)}
                onChange={(value) => {
                  field.onChange(value);
                  void handleFieldChange("amount", value);
                }}
                onBlur={field.onBlur}
                error={validationMessage(errors.amount?.message)}
                placeholder={t("importer.preview.amountPlaceholder")}
                type="text"
                className="text-right"
                numeric
              />
            )}
          />
        </TableCell>

        {/* Actions */}
        <TableCell>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(index)}
            aria-label={t("importer.preview.deleteRow", { row: index + 1 })}
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </TableCell>
      </TableRow>

      {/* Error Row - Display all field errors */}
      {hasErrors && (
        <TableRow className="bg-destructive/10 hover:bg-destructive/20">
          <TableCell colSpan={6} className="border-t">
            {/*
              This row restates every field error for the row as a whole. The
              cells own the per-field association; what this adds is a live
              region, so a correction that clears or changes the list is
              announced rather than only redrawn.
            */}
            <div
              role="status"
              aria-live="polite"
              className="text-xs text-destructive space-y-1"
            >
              {malformed && (
                <div className="flex items-start gap-1">
                  <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                  <span>{t("importer.preview.recordWidthError")}</span>
                </div>
              )}
              {Object.entries(errors).map(([field, error]) => (
                <div key={field} className="flex items-start gap-1">
                  <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                  <span>
                    <strong className="capitalize">{field}:</strong>{" "}
                    {validationMessage(error?.message)}
                  </span>
                </div>
              ))}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
