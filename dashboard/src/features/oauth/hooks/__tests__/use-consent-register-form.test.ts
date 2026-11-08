import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useConsentRegisterForm } from "../use-consent-register-form";

// The consent pages reset the Apollo store after every way of becoming signed
// in, so the next step reads as the new user. A sign-up that arrives already
// signed in (a self-hosted deployment) must do the same before it moves on.

const { signUp, resetStore } = vi.hoisted(() => ({
  signUp: vi.fn(),
  resetStore: vi.fn(),
}));
vi.mock("@apollo/client/react", () => ({
  useMutation: () => [signUp],
  useApolloClient: () => ({ resetStore }),
}));

const form = {
  email: "pat@example.org",
  username: "pat",
  password: "password123",
  confirmPassword: "password123",
};

describe("useConsentRegisterForm", () => {
  it("resets the store before advancing when sign-up arrives signed in", async () => {
    const order: string[] = [];
    resetStore.mockImplementationOnce(async () => void order.push("reset"));
    signUp.mockResolvedValueOnce({
      data: { signUp: { sessionId: "s-1", expireAt: "x", token: "jwt-1" } },
    });
    const onSignedIn = vi.fn(() => void order.push("advance"));
    const onSuccess = vi.fn();
    const { result } = renderHook(() =>
      useConsentRegisterForm({
        withDefaultLedger: true,
        onSuccess,
        onSignedIn,
      }),
    );
    await act(() => result.current.onSubmit(form));

    expect(onSignedIn).toHaveBeenCalledWith(form.email);
    expect(order).toEqual(["reset", "advance"]);
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("goes to the code step, without a reset, when a code was mailed", async () => {
    signUp.mockResolvedValueOnce({
      data: { signUp: { sessionId: "s-2", expireAt: "x", token: null } },
    });
    resetStore.mockClear();
    const onSignedIn = vi.fn();
    const onSuccess = vi.fn();
    const { result } = renderHook(() =>
      useConsentRegisterForm({
        withDefaultLedger: false,
        onSuccess,
        onSignedIn,
      }),
    );
    await act(() => result.current.onSubmit(form));

    expect(onSuccess).toHaveBeenCalledWith("s-2", form.email);
    expect(onSignedIn).not.toHaveBeenCalled();
    expect(resetStore).not.toHaveBeenCalled();
  });
});
