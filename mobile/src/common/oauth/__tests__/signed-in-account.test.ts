import { initializeSignedInAccount } from "../signed-in-account";

function dependencies(
  events: string[],
  ledgerIds: string[],
  selected: { value: string | null },
) {
  return {
    listLedgerIds: async () => ledgerIds,
    getSelectedLedger: () => selected.value,
    setSelectedLedger: (ledgerId: string | null) => {
      selected.value = ledgerId;
      events.push(`ledger:${ledgerId ?? "none"}`);
    },
    navigateToApp: () => events.push("navigate"),
    reportLedgerLoadFailure: () => events.push("ledger-error"),
  };
}

describe("initializeSignedInAccount", () => {
  it("selects a valid default ledger, then navigates", async () => {
    const events: string[] = [];
    const selected = { value: "old/ledger" as string | null };

    await initializeSignedInAccount(
      dependencies(events, ["ada/books", "ada/work"], selected),
    );

    expect(selected.value).toBe("ada/books");
    expect(events).toEqual(["ledger:ada/books", "navigate"]);
  });

  it("keeps a valid selected ledger", async () => {
    const events: string[] = [];
    const selected = { value: "ada/work" as string | null };

    await initializeSignedInAccount(
      dependencies(events, ["ada/books", "ada/work"], selected),
    );

    expect(selected.value).toBe("ada/work");
    expect(events).toEqual(["navigate"]);
  });

  it("still navigates when the post-login ledger query is offline", async () => {
    const events: string[] = [];
    const selected = { value: null as string | null };
    const deps = dependencies(events, [], selected);
    deps.listLedgerIds = async () => {
      throw new Error("offline");
    };

    await initializeSignedInAccount(deps);

    expect(events).toEqual(["ledger-error", "navigate"]);
  });
});
