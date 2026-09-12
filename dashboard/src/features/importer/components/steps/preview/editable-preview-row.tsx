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
  editableRowSchema,
  type EditableRowData,
  type ImporterValidationKey,
} from "../../../utils/row-edit-schema";
import { buildParsedRow } from "../../../utils/csv-validator";
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
  const { t } = useTranslations();
  const form = useForm<EditableRowData>({
    resolver: zodResolver(editableRowSchema),
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
  }, [row.id, trigger]);

  const hasErrors = Object.keys(errors).length > 0;
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
    onChange(
      index,
      buildParsedRow({
        id: row.id,
        date: values.date,
        payee: values.payee,
        description: values.description,
        amountInput: values.amount,
      }),
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
                value={field.value}
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
                value={field.value}
                onChange={(value) => {
                  field.onChange(value);
                  void handleFieldChange("payee", value);
                }}
                onBlur={field.onBlur}
                error={validationMessage(errors.payee?.message)}
                placeholder={t("importer.preview.payeePlaceholder")}
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
                value={field.value}
                onChange={(value) => {
                  field.onChange(value);
                  void handleFieldChange("amount", value);
                }}
                onBlur={field.onBlur}
                error={validationMessage(errors.amount?.message)}
                placeholder={t("importer.preview.amountPlaceholder")}
                type="text"
                className="text-right"
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
            aria-label={t("importer.preview.deleteRow")}
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
            <div className="text-xs text-destructive space-y-1">
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
