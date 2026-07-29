/**
 * EditablePreviewRow - Row component with inline editing capability
 * Integrates React Hook Form with EditableCell components
 */

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
} from "../../../utils/row-edit-schema";
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
      amount: row.amount.toString(),
    },
    mode: "onBlur",
  });
  const {
    control,
    formState: { errors },
    trigger,
  } = form;

  const hasErrors = Object.keys(errors).length > 0;

  const handleFieldChange = async (
    field: keyof EditableRowData,
    value: string,
  ) => {
    // Validate the specific field
    await trigger(field);

    // Read the current (post-validation) error state from the form to avoid stale closure
    const currentErrors = form.formState.errors;
    const currentHasErrors = Object.keys(currentErrors).length > 0;

    // Convert amount back to number for ParsedRow
    const updatedRow: ParsedRow = {
      ...row,
      [field]: field === "amount" ? parseFloat(value) || 0 : value,
      errors: currentHasErrors
        ? Object.values(currentErrors).map(
            (e) => e?.message || "Validation error",
          )
        : undefined,
    };

    onChange(index, updatedRow);
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
                error={errors.date?.message}
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
                error={errors.payee?.message}
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
                error={errors.description?.message}
                placeholder={t("importer.preview.descriptionPlaceholder")}
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
                error={errors.amount?.message}
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
                    {error?.message}
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
