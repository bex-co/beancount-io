import {
  confirmDiscardUnsavedEdits,
  registerUnsavedEditsGuard,
} from "../unsaved-edits-guard";

// w21/923: Open Account pushed over a dirty New Transaction replaced its guard,
// and its cleanup left nothing registered, so a link switched ledgers unasked.
describe("the unsaved-edits guards", () => {
  const asked: string[] = [];
  const answers = (name: string, answer: boolean) => () => {
    asked.push(name);
    return Promise.resolve(answer);
  };

  it("asks the screen below once the one over it has gone", async () => {
    asked.length = 0;
    const unregisterA = registerUnsavedEditsGuard(answers("A", false));
    const unregisterB = registerUnsavedEditsGuard(answers("B", true));
    unregisterB();
    expect(await confirmDiscardUnsavedEdits()).toBe(false);
    expect(asked).toEqual(["A"]);
    unregisterA();
  });

  it("asks every dirty screen, the newest first, and stops at a stay", async () => {
    asked.length = 0;
    const unregister = [
      registerUnsavedEditsGuard(answers("A", true)),
      registerUnsavedEditsGuard(answers("B", false)),
      registerUnsavedEditsGuard(answers("C", true)),
    ];
    expect(await confirmDiscardUnsavedEdits()).toBe(false);
    expect(asked).toEqual(["C", "B"]);
    unregister.forEach((remove) => remove());
  });

  it("goes on when nothing is dirty, or every screen discards", async () => {
    expect(await confirmDiscardUnsavedEdits()).toBe(true);
    const remove = registerUnsavedEditsGuard(answers("A", true));
    expect(await confirmDiscardUnsavedEdits()).toBe(true);
    remove();
    expect(await confirmDiscardUnsavedEdits()).toBe(true);
  });
});
