import fs from "fs";
import path from "path";
import {
  canonicalLedgerId,
  rekeyLedgers,
  renameLedgerKeys,
  renamedLedgerId,
  renamedLedgerScope,
  rescopeLedger,
} from "../ledger-owner-rename";

// w21/226: renaming the account renames the owner of every ledger it holds, and
// the app kept its selection, Recent accounts and merchant marks on the old ids.
describe("renamedLedgerId", () => {
  it("moves a ledger the renamed account owns", () => {
    expect(renamedLedgerId("alice/home", "alice", "alice2")).toBe(
      "alice2/home",
    );
    expect(renamedLedgerId("alice/a/b", "alice", "alice2")).toBe("alice2/a/b");
  });

  it("leaves a shared ledger, a lookalike owner and an unset owner alone", () => {
    expect(renamedLedgerId("bob/home", "alice", "alice2")).toBe("bob/home");
    expect(renamedLedgerId("alice-co/home", "alice", "alice2")).toBe(
      "alice-co/home",
    );
    expect(renamedLedgerId("alice", "alice", "alice2")).toBe("alice");
    expect(renamedLedgerId("alice/home", "", "x")).toBe("alice/home");
  });
});

describe("renameLedgerKeys", () => {
  it("re-keys per-ledger state and keeps every value", () => {
    const usage = {
      "alice/home": { "Expenses:Food": { count: 3 } },
      "bob/shared": { "Expenses:Fun": { count: 1 } },
    };
    expect(renameLedgerKeys(usage, "alice", "alice2")).toEqual({
      "alice2/home": { "Expenses:Food": { count: 3 } },
      "bob/shared": { "Expenses:Fun": { count: 1 } },
    });
  });

  it("returns a record unchanged when nothing is owned by the old name", () => {
    expect(renameLedgerKeys({ "bob/x": 1 }, "alice", "alice2")).toEqual({
      "bob/x": 1,
    });
    expect(renameLedgerKeys({}, "alice", "alice2")).toEqual({});
  });
});

// w21/644: the Transactions filters are stored with their ledger's id, and a
// rename left them on the old one, where readers drop them.
describe("renamedLedgerScope", () => {
  const filters = { accounts: ["Expenses:Food"] };

  it("moves filters applied to a ledger the renamed account owns", () => {
    expect(
      renamedLedgerScope(
        { ledgerId: "alice/home", filters },
        "alice",
        "alice2",
      ),
    ).toEqual({ ledgerId: "alice2/home", filters });
  });

  it("returns a shared ledger's or an empty scope as it was", () => {
    const shared = { ledgerId: "bob/home", filters };
    expect(renamedLedgerScope(shared, "alice", "alice2")).toBe(shared);
    const none = { ledgerId: null, filters };
    expect(renamedLedgerScope(none, "alice", "alice2")).toBe(none);
  });
});

describe("the Profile save", () => {
  it("follows the renamed ledgers with everything remembered per ledger", () => {
    const profile = fs
      .readFileSync(
        path.join(
          __dirname,
          "..",
          "..",
          "screens",
          "profile",
          "profile-screen.tsx",
        ),
        "utf8",
      )
      .replace(/\s+/g, "");
    const rename = profile.indexOf(
      "renameLedgerOwner(savedValues.username,pending.username);",
    );
    expect(rename > -1).toBe(true);
    // After the rename succeeded, before the directory is re-listed.
    expect(profile.indexOf("awaitupdateUsername(") < rename).toBe(true);
    expect(rename < profile.indexOf("refreshLedgers()")).toBe(true);
    expect(profile.includes('invalidateLedgerData(client,"file")')).toBe(true);

    const state = fs
      .readFileSync(
        path.join(__dirname, "..", "vars", "rename-ledger-owner.ts"),
        "utf8",
      )
      .replace(/\s+/g, "");
    for (const piece of [
      "ledgerVar(renamedLedgerId(selected,oldOwner,newOwner))",
      "accountUsageVar(renameLedgerKeys(accountUsageVar()",
      "merchantRecurringOverridesVar(renameLedgerKeys(merchantRecurringOverridesVar()",
      "renameTransactionFiltersOwner(oldOwner,newOwner)",
    ]) {
      expect(state.includes(piece)).toBe(true);
    }
    const filters = fs
      .readFileSync(
        path.join(
          __dirname,
          "..",
          "..",
          "screens",
          "transactions-screen",
          "filters",
          "var.ts",
        ),
        "utf8",
      )
      .replace(/\s+/g, "");
    expect(
      filters.includes(
        "transactionFiltersVar(renamedLedgerScope(transactionFiltersVar(),oldOwner,newOwner)",
      ),
    ).toBe(true);
  });
});

// w21/801: a ledger renamed on the web answered under its new name, and the
// app kept the old one: the drawer listed it twice and per-ledger state was
// left on the old id.
describe("a ledger renamed on the web", () => {
  it("is followed to the name the server answers it under", () => {
    expect(
      canonicalLedgerId("qa/personal", { fullName: "qa/personal-2025" }),
    ).toBe("qa/personal-2025");
    expect(canonicalLedgerId("qa/personal", { fullName: "qa/personal" })).toBe(
      null,
    );
    // Nothing to follow: no answer, a numeric selection, a malformed name.
    expect(canonicalLedgerId("qa/personal", undefined)).toBe(null);
    expect(canonicalLedgerId("2", { fullName: "qa/personal" })).toBe(null);
    expect(canonicalLedgerId("qa/personal", { fullName: "qa" })).toBe(null);
    expect(canonicalLedgerId(null, { fullName: "qa/personal" })).toBe(null);
  });

  it("moves only that ledger's keys and scope", () => {
    const map = (id: string) =>
      id === "qa/personal" ? "qa/personal-2025" : id;
    expect(
      rekeyLedgers({ "qa/personal": ["Assets:Cash"], "qa/budget": [] }, map),
    ).toEqual({ "qa/personal-2025": ["Assets:Cash"], "qa/budget": [] });
    expect(
      rescopeLedger(
        { ledgerId: "qa/personal", filters: { range: "all" } },
        map,
      ),
    ).toEqual({ ledgerId: "qa/personal-2025", filters: { range: "all" } });
    const other = { ledgerId: "qa/budget", filters: {} };
    expect(rescopeLedger(other, map)).toBe(other);
  });

  it("is followed when the splash check and the drawer read it", () => {
    const read = (...parts: string[]) =>
      fs
        .readFileSync(path.join(__dirname, "..", "..", ...parts), "utf8")
        .replace(/\s+/g, "");
    const splash = read(
      "common",
      "providers",
      "splash-provider",
      "splash-provider.tsx",
    );
    expect(
      splash.includes(
        "constrenamed=canonicalLedgerId(ledger,answer.data?.getLedger);if(renamed&&ledgerVar()===ledger){renameLedger(ledger,renamed);}",
      ),
    ).toBe(true);
    expect(
      splash.includes('if(outcome.status==="done")follow(outcome.value);'),
    ).toBe(true);
    expect(splash.includes("check.then(follow,()=>undefined);")).toBe(true);
    const drawer = read(
      "components",
      "ledger-drawer",
      "account-ledger-drawer.tsx",
    );
    expect(
      drawer.includes(
        "constrenamedTo=canonicalLedgerId(ledgerId,selectedData?.getLedger);",
      ),
    ).toBe(true);
    expect(drawer.includes("renameLedger(ledgerId,renamedTo);")).toBe(true);
    const vars = read("common", "vars", "rename-ledger-owner.ts");
    for (const moved of [
      "ledgerVar(map(selected))",
      "accountUsageVar(rekeyLedgers(accountUsageVar(),map));",
      "merchantRecurringOverridesVar(rekeyLedgers(merchantRecurringOverridesVar(),map),);",
      "moveTransactionFilters(map);",
    ]) {
      expect([moved, vars.includes(moved)]).toEqual([moved, true]);
    }
  });
});
