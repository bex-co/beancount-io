import { typeOfSelectExpression } from "../bql-expression-typer";

// Minimal leaf rule for isolation: the mapper tests cover the real name
// rule. Every tower rule below was probed against stock beanquery 0.2.0's
// reported column types, every call outtype live against the engine (w23/164).
const leaf = (name: string): string => {
  if (name === "number") return "Decimal";
  if (name === "payee") return "str";
  if (name === "date") return "date";
  return "str";
};

const typeOf = (text: string): string | undefined =>
  typeOfSelectExpression(text, leaf);

describe("typeOfSelectExpression literals", () => {
  it.each([
    ["1", "int"],
    ["+1", "int"],
    ["-1", "int"],
    ["1.5", "Decimal"],
    ["-1.5", "Decimal"],
    [".5", "Decimal"],
    ["5.", "Decimal"],
    ["'a'", "str"],
    ['"a"', "str"],
    ["'2024-01-01'", "str"],
    ["TRUE", "bool"],
    ["false", "bool"],
    ["NULL", "str"],
  ])("types %p as %p", (text, dtype) => {
    expect(typeOf(text)).toBe(dtype);
  });

  it("leaves exponent form untyped (both engines refuse it)", () => {
    expect(typeOf("1e3")).toBeUndefined();
  });
});

describe("typeOfSelectExpression calls", () => {
  it.each([
    ["upper(payee)", "str"],
    ["UPPER(payee)", "str"],
    ["year(date)", "int"],
    ["count(*)", "int"],
    ["count (*)", "int"],
    ["count(payee)", "int"],
    ["sum(number)", "Decimal"],
    ["sum(number + 1)", "Decimal"],
    ["sum(year(date))", "int"],
    ["min(date)", "date"],
    ["max(payee)", "str"],
    ["first(payee)", "str"],
    ["last(number)", "Decimal"],
    ["round(5)", "int"],
    ["round(1.5)", "Decimal"],
    ["upper(substr(payee, 1, 2))", "str"],
    ["length('abc')", "int"],
    ["today()", "date"],
  ])("types %p as %p", (text, dtype) => {
    expect(typeOf(text)).toBe(dtype);
  });

  it.each([
    "cost(position)",
    "coalesce(payee)",
    "bogus(number)",
    "sum()",
    "round(payee)",
    "upper(payee",
    "count(*",
  ])("leaves %p untyped", (text) => {
    expect(typeOf(text)).toBeUndefined();
  });

  it("ignores arity (an arity error belongs to the engine)", () => {
    expect(typeOf("upper()")).toBe("str");
  });
});

describe("typeOfSelectExpression operators", () => {
  it.each([
    ["1 + 1", "int"],
    ["1 + 1.5", "Decimal"],
    ["1.5 + 2.5", "Decimal"],
    ["5 - 10", "int"],
    ["2 * 3", "int"],
    ["2 * 1.5", "Decimal"],
    ["7 / 2", "Decimal"],
    ["7.0 / 2", "Decimal"],
    ["7 % 3", "int"],
    ["number % 2", "Decimal"],
    ["-5", "int"],
    ["- 5", "int"],
    ["-(3)", "int"],
    ["-number", "Decimal"],
    ["1 + 2 * 3", "int"],
    ["2 * 3 + 1", "int"],
    ["10 - 4 - 3", "int"],
    ["100 / 2 / 2", "Decimal"],
    ["(1 + 2) * 3", "int"],
    ["((1))", "int"],
    ["count(*) + 1", "int"],
    ["'a' + 'b'", "str"],
    ["'a' + 'b' + 'c'", "str"],
    ["date + 1", "date"],
    ["1 + date", "date"],
    ["date - 1", "date"],
    ["date - date", "int"],
    ["1 = 1", "bool"],
    ["1 < 2", "bool"],
    ["'a' = 'b'", "bool"],
    ["1 <> 2", "bool"],
    ["1 != 1", "bool"],
    ["1 <= 2", "bool"],
    ["1 >= 2", "bool"],
    ["TRUE AND FALSE", "bool"],
    ["TRUE OR FALSE", "bool"],
    ["NOT TRUE", "bool"],
    ["NOT payee", "bool"],
    ["1 IN (1, 2)", "bool"],
    ["1 BETWEEN 0 AND 5", "bool"],
    ["payee IS NULL", "bool"],
    ["payee IS NOT NULL", "bool"],
    ["'abc' ~ 'b'", "bool"],
  ])("types %p as %p", (text, dtype) => {
    expect(typeOf(text)).toBe(dtype);
  });

  it.each([
    "'a' - 'b'",
    "1 + 'a'",
    "1 + TRUE",
    "date + date",
    "1 / payee",
    "number * payee",
  ])("leaves %p untyped", (text) => {
    expect(typeOf(text)).toBeUndefined();
  });

  it("matches word operators on boundaries only", () => {
    expect(typeOf("oranges")).toBe("str");
    expect(typeOf("android")).toBe("str");
    expect(typeOf("login")).toBe("str");
    expect(typeOf("prison")).toBe("str");
    expect(typeOf("notice")).toBe("str");
  });
});

describe("typeOfSelectExpression leaves and junk", () => {
  it("types bare columns through the leaf rule", () => {
    expect(typeOf("number")).toBe("Decimal");
    expect(typeOf("NUMBER")).toBe("Decimal");
    expect(typeOf("  payee  ")).toBe("str");
  });

  it.each(["*", "", "foo bar", "(", "upper(x) OVER ()"])(
    "leaves %p untyped",
    (text) => {
      expect(typeOf(text)).toBeUndefined();
    },
  );

  it("caps pathological nesting instead of overflowing", () => {
    const deep = `${"(".repeat(100)}1${")".repeat(100)}`;
    expect(typeOf(deep)).toBeUndefined();
  });
});
