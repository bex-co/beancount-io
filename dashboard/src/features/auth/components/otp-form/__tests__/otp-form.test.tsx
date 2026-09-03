import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, describe, expect, it, vi } from "vitest";
import { OtpForm } from "../index";

afterAll(async () => {
  // input-otp queues 0/10/50 ms selection-sync callbacks without exposing
  // cleanup handles. Let those callbacks drain before Vitest tears down jsdom;
  // otherwise the final React update can run after `window` is gone.
  await new Promise((resolve) => setTimeout(resolve, 60));
});

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

  it("captures digits typed while the OTP input is not focused", async () => {
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
    const heading = screen.getByRole("heading", { name: "Verify your email" });
    await user.click(heading);
    expect(input).not.toHaveFocus();

    await user.keyboard("1234");

    expect(input).toHaveValue("1234");
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit.mock.calls[0][0]).toEqual({ otp: "1234" });
    });
  });

  it("captures a numeric code pasted while the OTP input is not focused", async () => {
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
    const heading = screen.getByRole("heading", { name: "Verify your email" });
    await user.click(heading);
    expect(input).not.toHaveFocus();

    fireEvent.paste(document, {
      clipboardData: { getData: () => "Your code is 9876" },
    });

    expect(input).toHaveValue("9876");
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit.mock.calls[0][0]).toEqual({ otp: "9876" });
    });
  });
});
