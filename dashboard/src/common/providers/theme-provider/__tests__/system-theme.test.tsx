import { render, screen, act } from "@testing-library/react";
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { ThemeProvider, useIsDarkTheme, useTheme } from "../index";

type MediaListener = (event: MediaQueryListEvent) => void;

function installMatchMedia(initialDark: boolean) {
  const listeners = new Set<MediaListener>();
  let matches = initialDark;
  const media = {
    matches,
    media: "(prefers-color-scheme: dark)",
    onchange: null,
    addEventListener: (_type: string, listener: MediaListener) => {
      listeners.add(listener);
    },
    removeEventListener: (_type: string, listener: MediaListener) => {
      listeners.delete(listener);
    },
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  };
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn(() => media),
  });
  return {
    setDark(next: boolean) {
      matches = next;
      media.matches = next;
      const event = { matches: next } as MediaQueryListEvent;
      for (const listener of listeners) {
        listener(event);
      }
    },
    listenerCount: () => listeners.size,
  };
}

function Probe() {
  const { theme, resolvedTheme } = useTheme();
  const isDark = useIsDarkTheme();
  return (
    <div>
      <span data-testid="pref">{theme}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      <span data-testid="is-dark">{String(isDark)}</span>
    </div>
  );
}

describe("ThemeProvider system appearance", () => {
  const storageKey = "vite-ui-theme-test";

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("light", "dark");
    delete window.__THEME__;
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("light", "dark");
  });

  it("updates the root class and hook consumers when prefers-color-scheme changes", async () => {
    const media = installMatchMedia(false);
    localStorage.setItem(storageKey, "system");

    render(
      <ThemeProvider storageKey={storageKey} defaultTheme="system">
        <Probe />
      </ThemeProvider>,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByTestId("pref")).toHaveTextContent("system");
    expect(screen.getByTestId("resolved")).toHaveTextContent("light");
    expect(document.documentElement.classList.contains("light")).toBe(true);

    await act(async () => {
      media.setDark(true);
    });

    expect(screen.getByTestId("pref")).toHaveTextContent("system");
    expect(screen.getByTestId("resolved")).toHaveTextContent("dark");
    expect(screen.getByTestId("is-dark")).toHaveTextContent("true");
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    await act(async () => {
      media.setDark(false);
    });

    expect(screen.getByTestId("resolved")).toHaveTextContent("light");
    expect(document.documentElement.classList.contains("light")).toBe(true);
  });

  it("ignores color-scheme events while an explicit theme is selected", async () => {
    const media = installMatchMedia(false);
    localStorage.setItem(storageKey, "light");

    render(
      <ThemeProvider storageKey={storageKey} defaultTheme="light">
        <Probe />
      </ThemeProvider>,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByTestId("resolved")).toHaveTextContent("light");

    await act(async () => {
      media.setDark(true);
    });

    expect(screen.getByTestId("pref")).toHaveTextContent("light");
    expect(screen.getByTestId("resolved")).toHaveTextContent("light");
    expect(document.documentElement.classList.contains("light")).toBe(true);
  });

  it("removes the media listener on unmount", async () => {
    const media = installMatchMedia(true);
    const view = render(
      <ThemeProvider storageKey={storageKey} defaultTheme="system">
        <Probe />
      </ThemeProvider>,
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(media.listenerCount()).toBe(1);

    view.unmount();
    expect(media.listenerCount()).toBe(0);
  });
});
