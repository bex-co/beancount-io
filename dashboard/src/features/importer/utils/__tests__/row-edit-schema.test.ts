import { describe, it, expect } from "vitest";
import {
  createEditableRowSchema,
  editableRowSchema,
  previewTableFormSchema,
} from "../row-edit-schema";

describe("row-edit-schema", () => {
  describe("editableRowSchema", () => {
    const validRow = {
      date: "2024-06-15",
      payee: "Starbucks",
      description: "Morning coffee",
      amount: "5.50",
    };

    it("should accept a valid row", () => {
      const result = editableRowSchema.safeParse(validRow);
      expect(result.success).toBe(true);
    });

    describe("date field", () => {
      it("should reject missing date", () => {
        const result = editableRowSchema.safeParse({
          ...validRow,
          date: "",
        });
        expect(result.success).toBe(false);
      });

      it("should reject incorrect date format", () => {
        const result = editableRowSchema.safeParse({
          ...validRow,
          date: "15/06/2024",
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          const dateErrors = result.error.issues.filter((i) =>
            i.path.includes("date"),
          );
          expect(dateErrors.length).toBeGreaterThan(0);
        }
      });

      it("should accept a valid YYYY-MM-DD date", () => {
        const result = editableRowSchema.safeParse({
          ...validRow,
          date: "2000-01-01",
        });
        expect(result.success).toBe(true);
      });

      it("should reject an impossible calendar day", () => {
        const result = editableRowSchema.safeParse({
          ...validRow,
          date: "2023-02-29",
        });
        expect(result.success).toBe(false);
      });

      // A day written YYYY-MM-DD that the calendar lacks is not told to use
      // YYYY-MM-DD; a misformatted one still is (w2/106).
      it.each([
        ["2026-02-30", "importer.validation.invalidDateValue"],
        ["2026-04-31", "importer.validation.invalidDateValue"],
        ["2026-13-01", "importer.validation.invalidDateValue"],
        ["09/07/2026", "importer.validation.invalidDateFormat"],
        ["2026-2-3", "importer.validation.invalidDateFormat"],
      ])("reports %s as %s", (date, message) => {
        const result = editableRowSchema.safeParse({ ...validRow, date });
        expect(result.success).toBe(false);
        const messages = result.error?.issues
          .filter((issue) => issue.path.includes("date"))
          .map((issue) => issue.message);
        expect(messages).toEqual([message]);
      });
    });

    describe("payee field", () => {
      it("should reject empty payee", () => {
        const result = editableRowSchema.safeParse({
          ...validRow,
          payee: "",
        });
        expect(result.success).toBe(false);
      });

      it("should reject whitespace-only payee", () => {
        const result = editableRowSchema.safeParse({
          ...validRow,
          payee: "   ",
        });
        expect(result.success).toBe(false);
      });

      it("should accept a valid payee", () => {
        const result = editableRowSchema.safeParse({
          ...validRow,
          payee: "Amazon",
        });
        expect(result.success).toBe(true);
      });
    });

    describe("description field", () => {
      it("should reject empty description", () => {
        const result = editableRowSchema.safeParse({
          ...validRow,
          description: "",
        });
        expect(result.success).toBe(false);
      });

      it("should reject whitespace-only description", () => {
        const result = editableRowSchema.safeParse({
          ...validRow,
          description: "  ",
        });
        expect(result.success).toBe(false);
      });

      it("should accept a valid description", () => {
        const result = editableRowSchema.safeParse({
          ...validRow,
          description: "Grocery shopping",
        });
        expect(result.success).toBe(true);
      });
    });

    describe("amount field", () => {
      it("should reject empty amount", () => {
        const result = editableRowSchema.safeParse({
          ...validRow,
          amount: "",
        });
        expect(result.success).toBe(false);
      });

      it("should reject non-numeric amount", () => {
        const result = editableRowSchema.safeParse({
          ...validRow,
          amount: "abc",
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          const amountErrors = result.error.issues.filter((i) =>
            i.path.includes("amount"),
          );
          expect(amountErrors.length).toBeGreaterThan(0);
        }
      });

      it("should accept a positive amount string", () => {
        const result = editableRowSchema.safeParse({
          ...validRow,
          amount: "123.45",
        });
        expect(result.success).toBe(true);
      });

      it("should accept a negative amount string", () => {
        const result = editableRowSchema.safeParse({
          ...validRow,
          amount: "-50.00",
        });
        expect(result.success).toBe(true);
      });

      it("should accept zero", () => {
        const result = editableRowSchema.safeParse({
          ...validRow,
          amount: "0",
        });
        expect(result.success).toBe(true);
      });

      it("rejects unsupported precision with a dedicated validation key", () => {
        const result = editableRowSchema.safeParse({
          ...validRow,
          amount: "0.123456789012345678",
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0]?.message).toBe(
            "importer.validation.amountUnsupportedPrecision",
          );
        }
      });
    });
  });

  describe("previewTableFormSchema", () => {
    it("should accept a form with multiple valid rows", () => {
      const form = {
        rows: [
          {
            date: "2024-01-01",
            payee: "Shop A",
            description: "Item A",
            amount: "10.00",
          },
          {
            date: "2024-01-02",
            payee: "Shop B",
            description: "Item B",
            amount: "-5.00",
          },
        ],
      };
      const result = previewTableFormSchema.safeParse(form);
      expect(result.success).toBe(true);
    });

    it("should accept a form with an empty rows array", () => {
      const result = previewTableFormSchema.safeParse({ rows: [] });
      expect(result.success).toBe(true);
    });

    it("should reject a form when any row is invalid", () => {
      const form = {
        rows: [
          {
            date: "2024-01-01",
            payee: "Shop A",
            description: "Item A",
            amount: "10.00",
          },
          {
            date: "bad-date",
            payee: "",
            description: "",
            amount: "nope",
          },
        ],
      };
      const result = previewTableFormSchema.safeParse(form);
      expect(result.success).toBe(false);
    });
  });

  describe("createEditableRowSchema amount convention (w3/644)", () => {
    const row = (amount: string) => ({
      date: "2026-09-05",
      payee: "QA",
      description: "Comma column",
      amount,
    });
    const amountMessages = (
      result: ReturnType<typeof editableRowSchema.safeParse>,
    ) =>
      result.success
        ? []
        : result.error.issues
            .filter((issue) => issue.path.includes("amount"))
            .map((issue) => issue.message);

    it("accepts a comma-decimal column's spellings", () => {
      const schema = createEditableRowSchema({ decimalComma: true });
      for (const amount of ["-4,50", "-1.000", "2.500,00"]) {
        expect(schema.safeParse(row(amount)).success).toBe(true);
      }
    });

    it("rejects a comma decimal in a dot-decimal column", () => {
      expect(amountMessages(editableRowSchema.safeParse(row("-4,50")))).toEqual(
        ["importer.validation.amountInvalid"],
      );
    });

    it("names a mixed column instead of reading the cell", () => {
      const schema = createEditableRowSchema({ decimalMixed: true });
      expect(amountMessages(schema.safeParse(row("1,234.56")))).toEqual([
        "importer.validation.amountMixedDecimals",
      ]);
    });
  });
});
