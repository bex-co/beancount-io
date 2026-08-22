import { slugify, validateLedgerName } from "@/shared/ledger-name";
import { DomainError } from "@/shared/errors";

describe("slugify (Python parity)", () => {
  it("matches the documented Python examples", () => {
    expect(slugify("My Ledger")).toBe("my-ledger");
    expect(slugify("Personal Finance 2024")).toBe("personal-finance-2024");
    expect(slugify("my_budget")).toBe("my_budget");
    expect(slugify("test--ledger")).toBe("test-ledger");
  });

  it("strips special characters and trims hyphens", () => {
    expect(slugify("Héllo Wörld!")).toBe("hllo-wrld");
    expect(slugify("--edge--")).toBe("edge");
    expect(slugify(".git")).toBe("git");
    expect(slugify("!!!")).toBe("");
  });
});

describe("validateLedgerName", () => {
  const messageOf = (name: string): string => {
    try {
      validateLedgerName(name);
      return "";
    } catch (err) {
      return (err as DomainError).message;
    }
  };

  it("accepts valid slugs", () => {
    expect(() => validateLedgerName("my-ledger_2")).not.toThrow();
  });

  it("rejects empty with the Python message", () => {
    expect(messageOf("")).toBe(
      "Ledger name must contain at least one alphanumeric character",
    );
  });

  it("rejects over-100-char names with the Python message", () => {
    const long = "a".repeat(101);
    expect(messageOf(long)).toBe(
      `Ledger name is too long (101 characters). Maximum is 100 characters after transformation`,
    );
  });

  it("rejects invalid charset / hyphen edges / no alphanumerics", () => {
    expect(messageOf("Bad Name")).toMatch(/can only contain lowercase/);
    expect(messageOf("-edge")).toMatch(/cannot start or end with a hyphen/);
    expect(messageOf("___")).toMatch(/at least one letter or number/);
  });
});
