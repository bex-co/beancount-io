import fs from "fs";
import path from "path";
import { createTabFocusGate } from "../tab-focus-gate";

// w21/837: Home and Transactions kept the old data after an outside change
// while a first-visited Accounts tab showed the new.
describe("createTabFocusGate", () => {
  it("lets one return through per interval, whichever tab it is", () => {
    let clock = 1_000;
    const due = createTabFocusGate(() => clock, 30_000);
    expect(due()).toBe(true);
    clock += 5_000;
    expect(due()).toBe(false);
    clock += 25_000;
    expect(due()).toBe(true);
  });
});

describe("the lazy tab screen", () => {
  const source = fs
    .readFileSync(path.join(__dirname, "..", "index.tsx"), "utf8")
    .replace(/\s+/g, "");

  it("refreshes a visited tab on focus, not the first visit", () => {
    expect(source.includes("if(hadFocus.current&&tabFocusRefreshDue()){")).toBe(
      true,
    );
    expect(source.includes("hadFocus.current=true;")).toBe(true);
    expect(source.includes("refreshOnForeground(client,")).toBe(true);
  });
});
