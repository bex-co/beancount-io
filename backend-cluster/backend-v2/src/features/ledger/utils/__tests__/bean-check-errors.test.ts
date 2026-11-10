import { diffBeanCheckErrors } from "@/features/ledger/utils/bean-check-errors";

const error = (message: string, source?: string) => ({
  message,
  ...(source && { source }),
});

describe("diffBeanCheckErrors", () => {
  // w23/034: a write that shifts lines moves every error below it.
  it("does not count an existing error that moved to another line", () => {
    expect(
      diffBeanCheckErrors(
        [error("Document file not found: a.pdf", "main.bean:93")],
        [error("Document file not found: a.pdf", "main.bean:97")],
      ),
    ).toEqual([]);
  });

  it("counts a second copy of a known message as new", () => {
    const known = error("Duplicate open", "main.bean:3");
    const copy = error("Duplicate open", "main.bean:40");
    expect(diffBeanCheckErrors([known], [known, copy])).toEqual([copy]);
  });

  it("counts the same message in another file as new", () => {
    const moved = error("Duplicate open", "txns/2026.bean:3");
    expect(
      diffBeanCheckErrors([error("Duplicate open", "main.bean:3")], [moved]),
    ).toEqual([moved]);
  });

  it("ignores the entry tag a re-dated or renamed entry rewrites", () => {
    expect(
      diffBeanCheckErrors(
        [error('Cannot interpolate (2026-08-30, "Groceries")', "main.bean:9")],
        [error('Cannot interpolate (2026-08-31, "Food")', "main.bean:9")],
      ),
    ).toEqual([]);
  });

  it("keeps a file name that itself contains a colon", () => {
    const other = error("Bad", "a:b.bean:2");
    expect(diffBeanCheckErrors([error("Bad", "a.bean:2")], [other])).toEqual([
      other,
    ]);
  });
});

// w1/236: a renamed file's errors went with it; keyed on the old path every
// one of them read as new.
describe("diffBeanCheckErrors with renamed files", () => {
  const renames = new Map([["broken.bean", "broken2.bean"]]);

  it("does not count the errors of a file that only moved", () => {
    expect(
      diffBeanCheckErrors(
        [
          error("Account was never opened", "broken.bean:1"),
          error("Account was never opened", "broken.bean:2"),
        ],
        [
          error("Account was never opened", "broken2.bean:1"),
          error("Account was never opened", "broken2.bean:2"),
        ],
        renames,
      ),
    ).toEqual([]);
  });

  it("still counts an error the moved file gained", () => {
    const gained = error("Unbalanced", "broken2.bean:9");
    expect(
      diffBeanCheckErrors(
        [error("Account was never opened", "broken.bean:1")],
        [error("Account was never opened", "broken2.bean:1"), gained],
        renames,
      ),
    ).toEqual([gained]);
  });

  it("does not excuse the same message in an unrelated file", () => {
    const elsewhere = error("Account was never opened", "other.bean:1");
    expect(
      diffBeanCheckErrors(
        [error("Account was never opened", "broken.bean:1")],
        [error("Account was never opened", "broken2.bean:1"), elsewhere],
        renames,
      ),
    ).toEqual([elsewhere]);
  });

  it("leaves errors with no file alone", () => {
    expect(
      diffBeanCheckErrors(
        [error("Load failed")],
        [error("Load failed")],
        renames,
      ),
    ).toEqual([]);
  });
});
