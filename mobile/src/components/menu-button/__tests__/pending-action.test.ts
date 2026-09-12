import { createPendingMenuAction } from "../pending-action";

describe("menu pending action", () => {
  it("fires the selected row's callback on dismissal, not on the tap", () => {
    // The regression: the row invoked its callback in the same handler that
    // closed the Modal, so `Share.share` ran while the modal was dismissing and
    // iOS never presented the share sheet.
    const calls: string[] = [];
    const pending = createPendingMenuAction();

    pending.select(() => calls.push("share"));
    expect(calls).toEqual([]);
    expect(pending.isPending()).toBe(true);

    pending.flush();
    expect(calls).toEqual(["share"]);
  });

  it("fires exactly once, however many dismissal events arrive", () => {
    const calls: string[] = [];
    const pending = createPendingMenuAction();

    pending.select(() => calls.push("share"));
    pending.flush();
    pending.flush();
    expect(calls).toEqual(["share"]);
    expect(pending.isPending()).toBe(false);
  });

  it("fires nothing when the menu is cancelled instead of chosen from", () => {
    const calls: string[] = [];
    const pending = createPendingMenuAction();

    pending.select(() => calls.push("share"));
    // Backdrop tap or hardware back: the dismissal still reaches `onDismiss`.
    pending.cancel();
    pending.flush();
    expect(calls).toEqual([]);
  });

  it("is inert when nothing was selected", () => {
    const pending = createPendingMenuAction();
    expect(pending.isPending()).toBe(false);
    expect(() => pending.flush()).not.toThrow();
  });

  it("runs the last row tapped when two selections race one dismissal", () => {
    const calls: string[] = [];
    const pending = createPendingMenuAction();

    pending.select(() => calls.push("edit"));
    pending.select(() => calls.push("share"));
    pending.flush();
    expect(calls).toEqual(["share"]);
  });

  it("clears before invoking, so a callback that reopens the menu is safe", () => {
    const calls: string[] = [];
    const pending = createPendingMenuAction();

    pending.select(() => {
      calls.push("share");
      // A callback that immediately queues the next action (e.g. reopening the
      // menu from a navigation callback) must not be clobbered by the flush
      // that is already in progress.
      pending.select(() => calls.push("second"));
    });
    pending.flush();
    expect(calls).toEqual(["share"]);
    expect(pending.isPending()).toBe(true);

    pending.flush();
    expect(calls).toEqual(["share", "second"]);
  });
});
