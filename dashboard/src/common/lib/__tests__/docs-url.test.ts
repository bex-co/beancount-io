import { describe, expect, it } from "vitest";
import { docsUrl } from "../docs-url";

describe("docsUrl", () => {
  it("serves English from the docs root", () => {
    expect(docsUrl("en", "cash-flow-roles")).toBe(
      "https://beancount.io/docs/cash-flow-roles",
    );
  });

  it("prefixes every other language", () => {
    expect(docsUrl("zh", "Basics/fava-options")).toBe(
      "https://beancount.io/zh/docs/Basics/fava-options",
    );
  });
});
