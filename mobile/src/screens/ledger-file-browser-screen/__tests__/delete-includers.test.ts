import fs from "fs";
import path from "path";
import { deleteRefusalIncluders } from "../utils";

// w21/587: deleting a file another file `include`s is refused by the server,
// naming the includers; the app offers to drop those lines with the file.
describe("deleteRefusalIncluders", () => {
  const refusal = (message: string) => new Error(message);

  it("reads the includers of the file being deleted", () => {
    expect(
      deleteRefusalIncluders(
        refusal(
          "books/2026/jan.bean is still included by main.bean, books/all.bean; remove the include from the including file(s) first, then delete",
        ),
        "books/2026/jan.bean",
      ),
    ).toEqual(["main.bean", "books/all.bean"]);
  });

  it("finds its own report among several and tolerates a leading slash", () => {
    const error = refusal(
      "a.bean is still included by main.bean; b.bean is still included by x.bean; remove the include from the including file(s) first, then delete",
    );
    expect(deleteRefusalIncluders(error, "/b.bean")).toEqual(["x.bean"]);
  });

  it("is null for another file's report, another error, or a non-error", () => {
    const error = refusal("a.bean is still included by main.bean; remove it");
    expect(deleteRefusalIncluders(error, "b.bean")).toBe(null);
    expect(deleteRefusalIncluders(refusal("Network request failed"), "a")).toBe(
      null,
    );
    expect(
      deleteRefusalIncluders("a.bean is still included by x", "a.bean"),
    ).toBe(null);
  });

  it("does not match a longer path that ends the same way", () => {
    const error = refusal("old/a.bean is still included by main.bean; x");
    expect(deleteRefusalIncluders(error, "a.bean")).toBe(null);
  });
});

describe("the delete dialog", () => {
  const src = fs
    .readFileSync(path.join(__dirname, "..", "index.tsx"), "utf8")
    .replace(/\s+/g, "");

  it("offers to remove the include, and resends the delete with that option", () => {
    expect(src.includes('t("ledgerDeleteFileRemoveInclude")')).toBe(true);
    expect(src.includes("confirmDelete(entry,true)")).toBe(true);
    expect(src.includes("...(removeIncludes?{removeIncludes:true}:{})")).toBe(
      true,
    );
  });
});
