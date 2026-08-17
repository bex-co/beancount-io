/**
 * The helper exists to make a mismatched picker callback unrepresentable, so
 * these assert exactly that: one push registers one callback, the key is the
 * shared one, and every caller type resolves to an account ordering.
 *
 * Seven call sites across five screens used to repeat "set the matching global
 * key, then push with `type`" by hand, with nothing tying the two halves
 * together — a caller could set `SelectedAssets` while pushing
 * `type: "expenses"` and the pick would silently go nowhere.
 */
import { SelectedAccount } from "../../../common/globalFnFactory";
import { accountOrderFor, pushAccountPicker } from "../push-account-picker";

/** Captures what the helper pushed, standing in for expo-router. */
const makeRouter = () => {
  const pushes: { pathname: string; params: Record<string, unknown> }[] = [];
  return {
    pushes,
    push: (arg: unknown) => {
      pushes.push(arg as { pathname: string; params: Record<string, unknown> });
    },
  };
};

describe("pushAccountPicker", () => {
  afterEach(() => {
    SelectedAccount.deleteFn();
  });

  it("registers the caller's callback under the one shared key", () => {
    const router = makeRouter();
    const onSelect = (account: string) => account;

    pushAccountPicker(router, {
      type: "budget",
      current: "Expenses:Food",
      onSelect,
    });

    expect(SelectedAccount.getFn()).toBe(onSelect);
  });

  it("pushes the picker route with the caller's type and current account", () => {
    const router = makeRouter();

    pushAccountPicker(router, {
      type: "posting",
      current: "Assets:Cash",
      onSelect: () => undefined,
    });

    expect(router.pushes.length).toBe(1);
    expect(router.pushes[0].pathname).toBe("/(app)/account-picker");
    expect(router.pushes[0].params).toEqual({
      type: "posting",
      selectedItem: "Assets:Cash",
    });
  });

  it("allows an empty field — a caller with nothing chosen yet", () => {
    const router = makeRouter();

    pushAccountPicker(router, { type: "assets", onSelect: () => undefined });

    expect(router.pushes[0].params).toEqual({
      type: "assets",
      selectedItem: undefined,
    });
  });

  // The registration is what a stale callback would defeat, so the last push
  // must own the key outright rather than layering on the previous one.
  it("replaces a previous registration rather than stacking", () => {
    const router = makeRouter();
    const first = (account: string) => `first:${account}`;
    const second = (account: string) => `second:${account}`;

    pushAccountPicker(router, { type: "assets", onSelect: first });
    pushAccountPicker(router, { type: "expenses", onSelect: second });

    expect(SelectedAccount.getFn()).toBe(second);
  });
});

describe("accountOrderFor", () => {
  // A picker that browses the wrong list still "works" — it just buries the
  // account the caller wanted. Every type is pinned so the table can't drift.
  it("browses from-accounts for the sources", () => {
    expect(accountOrderFor("assets")).toBe("from");
    expect(accountOrderFor("posting")).toBe("from");
    expect(accountOrderFor("filter")).toBe("from");
  });

  it("browses to-accounts for the destinations", () => {
    expect(accountOrderFor("expenses")).toBe("to");
    expect(accountOrderFor("budget")).toBe("to");
  });

  it("falls back to the destination ordering for an unknown type", () => {
    expect(accountOrderFor(undefined)).toBe("to");
    expect(accountOrderFor("not-a-picker")).toBe("to");
  });
});
