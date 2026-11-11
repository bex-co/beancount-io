/**
 * Zod schema for inline row editing validation
 */

import { z } from "zod";
import {
  parseDate,
  parseAmount,
  validatePayee,
  validateDescription,
} from "./csv-validator";

/**
 * The parser's decision for the row's amount column: its decimal mark, or
 * that the column mixes both, which the parser refuses.
 */
type AmountColumnConvention = {
  decimalComma?: boolean;
  decimalMixed?: boolean;
};

/**
 * Schema for a single editable row. The amount is read with its column's
 * convention, the same rule `buildParsedRow` and Configure apply, so a
 * comma-decimal `-4,50` the parser accepted is not flagged here (w3/644).
 */
export const createEditableRowSchema = ({
  decimalComma = false,
  decimalMixed = false,
}: AmountColumnConvention = {}) =>
  z.object({
    date: z
      .string()
      .min(1, "importer.validation.dateRequired")
      .superRefine((val: string, ctx) => {
        const result = parseDate(val);
        if (result.valid) return;
        // A well-formed day that is not on the calendar is not a format
        // mistake: `2026-02-30` already reads YYYY-MM-DD (w2/106).
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            result.reason === "value"
              ? "importer.validation.invalidDateValue"
              : "importer.validation.invalidDateFormat",
        });
      }),

    payee: z
      .string()
      .min(1, "importer.validation.payeeRequired")
      .refine((val: string) => validatePayee(val).valid, {
        message: "importer.validation.payeeRequired",
      }),

    description: z
      .string()
      .min(1, "importer.validation.descriptionRequired")
      .refine((val: string) => validateDescription(val).valid, {
        message: "importer.validation.descriptionRequired",
      }),

    amount: z
      .string()
      .min(1, "importer.validation.amountRequired")
      .superRefine((val: string, ctx) => {
        if (decimalMixed) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "importer.validation.amountMixedDecimals",
          });
          return;
        }
        const result = parseAmount(val, { decimalComma });
        if (result.valid) return;
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            result.reason === "unsupported-precision"
              ? "importer.validation.amountUnsupportedPrecision"
              : "importer.validation.amountInvalid",
        });
      }),
  });

/** A dot-decimal row's schema. */
export const editableRowSchema = createEditableRowSchema();

/**
 * Schema for the full form with array of rows
 */
export const previewTableFormSchema = z.object({
  rows: z.array(editableRowSchema),
});

/**
 * Type inference for form data
 */
export type EditableRowData = z.infer<typeof editableRowSchema>;
export type PreviewTableFormData = z.infer<typeof previewTableFormSchema>;
export type ImporterValidationKey =
  | "importer.validation.dateRequired"
  | "importer.validation.invalidDateFormat"
  | "importer.validation.invalidDateValue"
  | "importer.validation.payeeRequired"
  | "importer.validation.descriptionRequired"
  | "importer.validation.amountRequired"
  | "importer.validation.amountInvalid"
  | "importer.validation.amountMixedDecimals"
  | "importer.validation.amountUnsupportedPrecision";
