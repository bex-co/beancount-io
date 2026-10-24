import fs from "fs";
import path from "path";

// w21/964: a page requested for one list landed on another (the conversion
// changed while it was in flight), merging its rows and its "last page" state
// into the new list.
describe("account detail's load-more page", () => {
  const source = fs
    .readFileSync(
      path.join(__dirname, "..", "account-detail-screen.tsx"),
      "utf8",
    )
    .replace(/\s+/g, "");

  it("is dropped, before any merge or state, when the list is no longer the one requested", () => {
    expect(source.includes("constrequestedFor=listKeyRef.current;")).toBe(true);
    const update = source.indexOf("updateQuery:(prev,{fetchMoreResult})=>{");
    const guard = source.indexOf(
      "if(listKeyRef.current!==requestedFor)returnprev;",
      update,
    );
    const merge = source.indexOf("mergeAccountJournalItems(", update);
    const state = source.indexOf("setLastJournalPage(page);", update);
    expect(update > -1 && guard > update).toBe(true);
    expect(guard < merge && guard < state).toBe(true);
  });

  it("keeps the key it compares current, from the same key the failure state uses", () => {
    expect(
      source.includes(
        "constlistKey=`${ledgerId}|${account}|${journalConversion}`;",
      ),
    ).toBe(true);
    expect(
      source.includes("listKeyRef=useRef(listKey);listKeyRef.current=listKey;"),
    ).toBe(true);
  });
});
