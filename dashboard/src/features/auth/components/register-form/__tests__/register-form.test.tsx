import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { RegisterForm } from "../index";

describe("RegisterForm with the username hidden", () => {
  it("submits the generated username without asking the user to type it", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <RegisterForm
        onSubmit={onSubmit}
        isLoading={false}
        serverError=""
        defaultUsername="un_generated1"
        hideUsername={true}
        showSignInLink={false}
      />,
    );

    expect(screen.queryByLabelText("Username")).toBeNull();

    await user.type(screen.getByLabelText("First Name"), "Ada");
    await user.type(screen.getByLabelText("Last Name"), "Lovelace");
    await user.type(screen.getByLabelText("Email address"), "ada@example.test");
    await user.type(screen.getByLabelText("Password"), "secret123");
    await user.type(screen.getByLabelText("Confirm Password"), "secret123");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      email: "ada@example.test",
      username: "un_generated1",
    });
  });

  it("keeps the username field on the standalone sign-up form", () => {
    render(
      <RegisterForm
        onSubmit={vi.fn()}
        isLoading={false}
        serverError=""
        defaultUsername="un_generated1"
        showSignInLink={false}
      />,
    );
    expect(screen.getByLabelText("Username")).toHaveValue("un_generated1");
  });
});

describe("RegisterForm username validation focus", () => {
  it("focuses Username and associates its error after an invalid submit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <RegisterForm
        onSubmit={onSubmit}
        isLoading={false}
        serverError=""
        defaultUsername=""
        showSignInLink={false}
      />,
    );

    await user.type(screen.getByLabelText("Email address"), "ada@example.test");
    await user.clear(screen.getByLabelText("Username"));
    await user.type(screen.getByLabelText("Username"), "qa-invalid-name");
    await user.type(screen.getByLabelText("Password"), "secret123");
    await user.type(screen.getByLabelText("Confirm Password"), "secret123");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    const username = screen.getByLabelText("Username");
    await waitFor(() => {
      expect(username).toHaveFocus();
    });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(username).toHaveAttribute("aria-invalid", "true");
    expect(username.getAttribute("aria-describedby") ?? "").toContain(
      "username-error",
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Username can only contain lowercase letters, numbers, and underscores",
    );
  });

  it("normalizes mixed-case usernames and clears the error when repaired", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <RegisterForm
        onSubmit={onSubmit}
        isLoading={false}
        serverError=""
        defaultUsername=""
        showSignInLink={false}
      />,
    );

    await user.type(screen.getByLabelText("Email address"), "ada@example.test");
    await user.type(screen.getByLabelText("Username"), "qa-invalid-name");
    await user.type(screen.getByLabelText("Password"), "secret123");
    await user.type(screen.getByLabelText("Confirm Password"), "secret123");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Username")).toHaveFocus();
    });

    await user.clear(screen.getByLabelText("Username"));
    await user.type(screen.getByLabelText("Username"), "Qa_valid_name");
    expect(screen.getByLabelText("Username")).toHaveValue("qa_valid_name");
    await user.tab();

    await waitFor(() => {
      expect(screen.queryByRole("alert")).toBeNull();
    });
  });
});
