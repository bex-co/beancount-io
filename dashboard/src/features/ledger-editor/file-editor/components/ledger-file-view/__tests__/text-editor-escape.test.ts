import { describe, expect, it } from "vitest";
import {
  isEscapeOwnedByOverlay,
  isMonacoFindWidgetVisible,
  shouldCancelEditOnEscape,
} from "../text-editor-utils";

function makeEditor(isRevealed: boolean) {
  return {
    getContribution: () => ({
      getState: () => ({ isRevealed }),
    }),
  };
}

describe("shouldCancelEditOnEscape", () => {
  it("cancels when Find is closed and focus is in the editor body", () => {
    expect(shouldCancelEditOnEscape(makeEditor(false), document.body)).toBe(
      true,
    );
  });

  it("does not cancel while Monaco Find is revealed", () => {
    expect(shouldCancelEditOnEscape(makeEditor(true), document.body)).toBe(
      false,
    );
    expect(isMonacoFindWidgetVisible(makeEditor(true))).toBe(true);
  });

  it("does not cancel Escape owned by a dialog or menu", () => {
    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    const input = document.createElement("input");
    dialog.appendChild(input);
    document.body.appendChild(dialog);

    expect(isEscapeOwnedByOverlay(input)).toBe(true);
    expect(shouldCancelEditOnEscape(makeEditor(false), input)).toBe(false);

    dialog.remove();
  });

  it("still cancels for a dirty buffer when Find is closed", () => {
    // Draft preservation is owned by Cancel/Leave; Escape must still exit
    // edit mode only when Find is not open.
    expect(shouldCancelEditOnEscape(makeEditor(false), document.body)).toBe(
      true,
    );
  });
});
