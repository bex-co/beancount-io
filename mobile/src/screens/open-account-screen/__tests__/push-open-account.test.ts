/**
 * The helper makes a mismatched create-flow handoff unrepresentable: one call
 * registers the receiver and pushes the prefilled route, and the delivery is
 * one-shot — consumed on the first success, a no-op when nothing registered,
 * so the open-account screen needs no origin flag.
 */
import {
  AccountCreated,
  runAccountCreatedCallback,
} from "../../../common/globalFnFactory";
import { pushOpenAccount } from "../push-open-account";

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

describe("pushOpenAccount", () => {
  afterEach(() => {
    AccountCreated.deleteFn();
  });

  it("registers the receiver and pushes the prefilled route in one call", () => {
    const router = makeRouter();
    const onCreated = (account: string) => account;

    pushOpenAccount(router, {
      prefill: "coffee shop",
      prefillRoot: "Expenses",
      onCreated,
    });

    expect(AccountCreated.getFn()).toBe(onCreated);
    expect(router.pushes.length).toBe(1);
    expect(router.pushes[0].pathname).toBe("/(app)/open-account");
    expect(router.pushes[0].params).toEqual({
      prefill: "coffee shop",
      prefillRoot: "Expenses",
    });
  });

  it("delivers exactly once, then the registration is gone", () => {
    const router = makeRouter();
    const received: string[] = [];

    pushOpenAccount(router, {
      prefill: "Coffee",
      prefillRoot: "Expenses",
      onCreated: (account) => received.push(account),
    });

    runAccountCreatedCallback("Expenses:Coffee");
    runAccountCreatedCallback("Expenses:Coffee");

    expect(received).toEqual(["Expenses:Coffee"]);
    expect(AccountCreated.hasFn()).toBe(false);
  });

  it("is a no-op with nothing registered — the Accounts-tab entry", () => {
    const received: string[] = [];
    AccountCreated.deleteFn();

    runAccountCreatedCallback("Assets:Bank:Checking");

    expect(received).toEqual([]);
  });

  it("replaces a previous registration rather than stacking", () => {
    const router = makeRouter();
    const first = (account: string) => `first:${account}`;
    const second = (account: string) => `second:${account}`;

    pushOpenAccount(router, {
      prefill: "A",
      prefillRoot: "Assets",
      onCreated: first,
    });
    pushOpenAccount(router, {
      prefill: "B",
      prefillRoot: "Expenses",
      onCreated: second,
    });

    expect(AccountCreated.getFn()).toBe(second);
  });
});
