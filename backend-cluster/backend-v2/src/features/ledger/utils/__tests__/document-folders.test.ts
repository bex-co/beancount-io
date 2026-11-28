import { accountFolder, documentRoots } from "../document-folders";

/** w31/149 — the folders an account rename moves, found as discovery finds them. */
describe("documentRoots", () => {
  it("reads each documents option of the entry point as a repository path", () => {
    expect(
      documentRoots(
        [
          'option "operating_currency" "USD"',
          'option "documents" "docs"',
          '  option "documents" "./scans/"',
          'option "documents" "docs"',
          "",
        ].join("\n"),
        "main.bean",
      ),
    ).toEqual(["docs", "scans"]);
  });

  it('reads "." as the repository root and resolves against the entry point folder', () => {
    expect(documentRoots('option "documents" "."\n', "main.bean")).toEqual([
      "",
    ]);
    expect(
      documentRoots('option "documents" "../docs"\n', "ledger/main.bean"),
    ).toEqual(["docs"]);
  });

  it("leaves out a root outside the repository, and commented or other options", () => {
    expect(
      documentRoots(
        [
          'option "documents" "../elsewhere"',
          '; option "documents" "old"',
          'option "title" "documents"',
        ].join("\n"),
        "main.bean",
      ),
    ).toEqual([]);
  });

  it("names each account's folder under its root", () => {
    expect(accountFolder("docs", "Assets:Bank:Checking")).toBe(
      "docs/Assets/Bank/Checking",
    );
    expect(accountFolder("", "Expenses:Food:日本")).toBe("Expenses/Food/日本");
  });
});
