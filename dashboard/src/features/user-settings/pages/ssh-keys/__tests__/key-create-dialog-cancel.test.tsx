import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { KeyCreateDialog } from "../key-create-dialog";

const mockCreateKeyMutation = vi.fn();

vi.mock("@apollo/client/react", () => ({
  useMutation: () => [mockCreateKeyMutation, { loading: false }],
}));

vi.mock("@/common/lib/errors/error-message", () => ({
  useErrorMessage: () => (error: unknown) =>
    error instanceof Error ? error.message : "Unknown error",
}));

describe("KeyCreateDialog cancel resets draft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("clears title and public key after Cancel before reopening", () => {
    render(
      <KeyCreateDialog>
        <button type="button">New SSH key</button>
      </KeyCreateDialog>,
    );

    fireEvent.click(screen.getByRole("button", { name: "New SSH key" }));

    const title = screen.getByLabelText("Key Title");
    const publicKey = screen.getByLabelText("Public Key");
    fireEvent.change(title, { target: { value: "qa-discard" } });
    fireEvent.change(publicKey, {
      target: { value: "qa-public-key-placeholder" },
    });
    expect(title).toHaveValue("qa-discard");
    expect(publicKey).toHaveValue("qa-public-key-placeholder");

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "New SSH key" }));

    expect(screen.getByLabelText("Key Title")).toHaveValue("");
    expect(screen.getByLabelText("Public Key")).toHaveValue("");
  });
});
