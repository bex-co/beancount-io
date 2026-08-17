import {
  AddTransactionCallback,
  SelectedAccount,
  getGlobalFn,
} from "../globalFnFactory";

describe("globalFnFactory helpers", () => {
  afterEach(() => {
    SelectedAccount.deleteFn();
    AddTransactionCallback.deleteFn();
  });

  it("stores and retrieves callbacks with SelectedAccount", () => {
    const handler = () => 42;
    SelectedAccount.setFn(handler);

    const stored = SelectedAccount.getFn();
    expect(stored).toBe(handler);
    expect(SelectedAccount.hasFn()).toBe(true);

    SelectedAccount.deleteFn();
    expect(SelectedAccount.getFn()).toBe(undefined);
    expect(SelectedAccount.hasFn()).toBe(false);
  });

  it("allows retrieving callbacks via getGlobalFn", async () => {
    const callback = async (): Promise<void> => {
      await Promise.resolve("done");
    };
    AddTransactionCallback.setFn(callback);

    const lookedUp = getGlobalFn<typeof callback>("AddTransactionCallback");
    expect(lookedUp).toBe(callback);
    await lookedUp?.();
  });

  it("returns undefined for non-existent keys", () => {
    const result = getGlobalFn("NonExistentKey");
    expect(result).toBe(undefined);
  });

  it("can store multiple different callbacks", () => {
    const callback1 = (value: string) => console.log(value);
    const callback2 = async () => Promise.resolve();

    SelectedAccount.setFn(callback1);
    AddTransactionCallback.setFn(callback2);

    expect(SelectedAccount.getFn()).toBe(callback1);
    expect(AddTransactionCallback.getFn()).toBe(callback2);
  });

  it("overwrites previous callback when setting a new one", () => {
    const callback1 = (value: string) => console.log("first", value);
    const callback2 = (value: string) => console.log("second", value);

    SelectedAccount.setFn(callback1);
    expect(SelectedAccount.getFn()).toBe(callback1);

    SelectedAccount.setFn(callback2);
    expect(SelectedAccount.getFn()).toBe(callback2);
    expect(SelectedAccount.getFn()).not.toBe(callback1);
  });
});
