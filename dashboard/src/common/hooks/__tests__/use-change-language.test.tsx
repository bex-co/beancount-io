import { act, renderHook } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { createLocalization } from "@/i18n/init";
import { LocalizationProvider } from "@/i18n/provider";
import { useChangeLanguage } from "../use-change-language";

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

beforeEach(() => vi.clearAllMocks());

it("keeps the current language and preference on failed loading and offers recovery", async () => {
  const localization = createLocalization();
  vi.spyOn(localization, "changeLanguage").mockRejectedValue(
    new Error("Chunk unavailable"),
  );
  const { result } = renderHook(() => useChangeLanguage(), {
    wrapper: ({ children }) => (
      <LocalizationProvider localization={localization}>
        {children}
      </LocalizationProvider>
    ),
  });
  await act(async () => {
    expect(await result.current.changeLanguage("ja")).toBe(false);
  });
  expect(localization.i18n.language).toBe("en");
  expect(localStorage.setItem).not.toHaveBeenCalled();
  expect(result.current.isChangingLanguage).toBe(false);
  expect(toast.error).toHaveBeenCalledWith("An error occurred", {
    action: { label: "Try Again", onClick: expect.any(Function) },
  });
});

it("does not persist a superseded selection", async () => {
  const localization = createLocalization();
  const { result } = renderHook(() => useChangeLanguage(), {
    wrapper: ({ children }) => (
      <LocalizationProvider localization={localization}>
        {children}
      </LocalizationProvider>
    ),
  });
  await act(async () => {
    const first = result.current.changeLanguage("fr");
    const last = result.current.changeLanguage("en");
    await Promise.all([first, last]);
  });
  expect(localization.i18n.language).toBe("en");
  expect(localStorage.setItem).toHaveBeenCalledExactlyOnceWith(
    "i18nextLng",
    "en",
  );
});
