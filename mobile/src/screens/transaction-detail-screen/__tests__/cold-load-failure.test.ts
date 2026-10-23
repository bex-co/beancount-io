import fs from "fs";
import path from "path";

// w21/296: a transaction opened cold from a link showed every load failure as
// "No entry context data available", with no Retry. The screen runs hooks this
// runner cannot execute, so the wiring is checked on its source.
describe("a transaction detail opened without a stashed entry", () => {
  const source = fs
    .readFileSync(
      path.join(__dirname, "..", "transaction-detail-screen.tsx"),
      "utf8",
    )
    .replace(/\s+/g, "");
  const branch = source.slice(source.indexOf("if(!entry){"));

  it("shows a failed load with Retry, not the empty text", () => {
    const failure = branch.indexOf("error?(");
    const empty = branch.indexOf('t("journalNoData")');
    expect(failure === -1 || empty === -1).toBe(false);
    expect(failure < empty).toBe(true);
    expect(
      branch
        .slice(failure, empty)
        .includes(
          "<CardLoadFailureonRetry={()=>voidrefetchContext().catch(()=>undefined)}/>",
        ),
    ).toBe(true);
  });

  it("still shows the removed state for a NOT_FOUND, before this branch", () => {
    expect(
      source.indexOf("if(entryGone){") < source.indexOf("if(!entry){"),
    ).toBe(true);
    expect(
      source.includes(
        "gone:entryGone}=selectEntrySource({entry,sourced,notFound:isEntryGone(error),});",
      ),
    ).toBe(true);
  });
});
