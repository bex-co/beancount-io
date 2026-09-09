import { describe, expect, it, vi } from "vitest";
import { restoreFocusOnDialogClose } from "../restore-focus-on-dialog-close";

describe("restoreFocusOnDialogClose", () => {
  it("focuses the preferred opener when it is still connected", () => {
    const preferred = document.createElement("button");
    document.body.appendChild(preferred);
    const fallback = document.createElement("button");
    document.body.appendChild(fallback);
    const focus = vi.spyOn(preferred, "focus");
    const event = new Event("focus") as Event & {
      preventDefault: () => void;
    };
    event.preventDefault = vi.fn();

    restoreFocusOnDialogClose(event, preferred, fallback);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(focus).toHaveBeenCalled();
    preferred.remove();
    fallback.remove();
  });

  it("falls back when the preferred opener was removed", () => {
    const preferred = document.createElement("button");
    const fallback = document.createElement("button");
    document.body.appendChild(fallback);
    const focus = vi.spyOn(fallback, "focus");
    const event = new Event("focus") as Event & {
      preventDefault: () => void;
    };
    event.preventDefault = vi.fn();

    restoreFocusOnDialogClose(event, preferred, fallback);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(focus).toHaveBeenCalled();
    fallback.remove();
  });

  it("leaves Radix default behavior when no connected target exists", () => {
    const detached = document.createElement("button");
    const event = new Event("focus") as Event & {
      preventDefault: () => void;
    };
    event.preventDefault = vi.fn();

    restoreFocusOnDialogClose(event, detached, null);

    expect(event.preventDefault).not.toHaveBeenCalled();
  });
});
