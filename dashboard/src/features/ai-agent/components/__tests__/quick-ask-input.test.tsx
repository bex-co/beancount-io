import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QuickAskInput } from "../quick-ask-input";

const mockNavigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ ledgerOwner: "user1", ledgerName: "main" }),
}));

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({ t: (key: string) => key }),
}));

describe("QuickAskInput", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it("renders input and ask button", () => {
    render(<QuickAskInput />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("ask button is disabled when input is empty", () => {
    render(<QuickAskInput />);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("ask button is enabled when input has value", () => {
    render(<QuickAskInput />);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "What is my balance?" },
    });
    expect(screen.getByRole("button")).not.toBeDisabled();
  });

  it("navigates to ask page with question when button is clicked", () => {
    render(<QuickAskInput />);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "What is my balance?" },
    });
    fireEvent.click(screen.getByRole("button"));
    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/ledger/$ledgerOwner/$ledgerName/ask",
      params: { ledgerOwner: "user1", ledgerName: "main" },
      search: { q: "What is my balance?" },
    });
  });

  it("navigates when Enter key is pressed", () => {
    render(<QuickAskInput />);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "What is my balance?" },
    });
    fireEvent.keyDown(screen.getByRole("textbox"), {
      key: "Enter",
      shiftKey: false,
    });
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it("does NOT navigate when input is empty", () => {
    render(<QuickAskInput />);
    fireEvent.keyDown(screen.getByRole("textbox"), {
      key: "Enter",
      shiftKey: false,
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
