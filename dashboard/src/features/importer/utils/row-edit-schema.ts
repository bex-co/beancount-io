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
 * Schema for a single editable row
 */
export const editableRowSchema = z.object({
  date: z
    .string()
    .min(1, "importer.validation.dateRequired")
    .refine((val: string) => parseDate(val).valid, {
      message: "importer.validation.invalidDateFormat",
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
    .refine((val: string) => parseAmount(val).valid, {
      message: "importer.validation.amountInvalid",
    }),
});

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
  | "importer.validation.payeeRequired"
  | "importer.validation.descriptionRequired"
  | "importer.validation.amountRequired"
  | "importer.validation.amountInvalid";
