import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { OtpForm } from "../index";

describe("OtpForm signup contract", () => {
  it("accepts and submits exactly four digits", async () => {
    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      value: vi.fn(() => null),
    });
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <OtpForm
        email="person@example.com"
        onSubmit={onSubmit}
        isLoading={false}
        serverError=""
      />,
    );

    const input = screen.getByRole("textbox");
    const submit = screen.getByRole("button", { name: "Verify Email" });

    expect(input).toHaveAttribute("maxlength", "4");
    expect(submit).toBeDisabled();

    await user.type(input, "1234");

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
      expect(onSubmit.mock.calls[0][0]).toEqual({ otp: "1234" });
    });
  });
});
