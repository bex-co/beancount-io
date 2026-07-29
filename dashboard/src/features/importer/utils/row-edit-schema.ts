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
    .min(1, "Date is required")
    .refine((val: string) => parseDate(val).valid, {
      message: "Invalid date format. Expected YYYY-MM-DD",
    }),

  payee: z
    .string()
    .min(1, "Payee is required")
    .refine((val: string) => validatePayee(val).valid, {
      message: "Payee cannot be empty",
    }),

  description: z
    .string()
    .min(1, "Description is required")
    .refine((val: string) => validateDescription(val).valid, {
      message: "Description cannot be empty",
    }),

  amount: z
    .string()
    .min(1, "Amount is required")
    .refine((val: string) => parseAmount(val).valid, {
      message: "Amount must be a valid number",
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
