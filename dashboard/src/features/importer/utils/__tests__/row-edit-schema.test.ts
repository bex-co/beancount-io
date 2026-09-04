import { describe, it, expect } from "vitest";
import { editableRowSchema, previewTableFormSchema } from "../row-edit-schema";

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
});
