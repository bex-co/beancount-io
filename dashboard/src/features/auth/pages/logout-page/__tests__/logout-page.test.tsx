import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LogoutPage from "../index";

const { mockClearUserId, mockLogout, mockRedirectToLogin } = vi.hoisted(() => ({
  mockClearUserId: vi.fn(),
  mockLogout: vi.fn(),
  mockRedirectToLogin: vi.fn(),
}));

vi.mock("@apollo/client/react", () => ({
  useMutation: () => [mockLogout],
}));

vi.mock("@/common/analytics", () => ({
  clearUserId: mockClearUserId,
}));

vi.mock("@/common/components/seo/page-seo", () => ({
  PageSEO: () => null,
}));

vi.mock("../redirect-to-login", () => ({
  redirectToLoginAfterLogout: mockRedirectToLogin,
}));

describe("LogoutPage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockLogout.mockResolvedValue({ data: { logout: { success: true } } });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("replaces the document after logout without resetting active queries", async () => {
    render(<LogoutPage />);

    expect(screen.getByText("Logging Out")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });

    expect(mockLogout).toHaveBeenCalledOnce();
    expect(mockClearUserId).toHaveBeenCalledOnce();
    expect(screen.getByText("Success")).toBeInTheDocument();
    expect(mockRedirectToLogin).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    expect(mockRedirectToLogin).toHaveBeenCalledOnce();
  });

  it("still replaces the document when the backend logout request fails", async () => {
    const error = new Error("network unavailable");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    mockLogout.mockRejectedValue(error);

    render(<LogoutPage />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1400);
    });

    expect(warn).toHaveBeenCalledWith("Backend logout request failed:", error);
    expect(mockClearUserId).toHaveBeenCalledOnce();
    expect(mockRedirectToLogin).toHaveBeenCalledOnce();

    warn.mockRestore();
  });
});
