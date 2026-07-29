import { describe, it, expect, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePlatform, useIsMac } from "../use-platform";

describe("usePlatform", () => {
  const originalPlatform = navigator.platform;

  afterEach(() => {
    // Restore original platform
    Object.defineProperty(navigator, "platform", {
      value: originalPlatform,
      configurable: true,
    });
  });

  describe("macOS detection", () => {
    it("should detect macOS from 'MacIntel'", () => {
      Object.defineProperty(navigator, "platform", {
        value: "MacIntel",
        configurable: true,
      });

      const { result } = renderHook(() => usePlatform());
      expect(result.current.isMac).toBe(true);
      expect(result.current.isWindows).toBe(false);
      expect(result.current.isLinux).toBe(false);
    });

    it("should detect macOS from 'MacPPC'", () => {
      Object.defineProperty(navigator, "platform", {
        value: "MacPPC",
        configurable: true,
      });

      const { result } = renderHook(() => usePlatform());
      expect(result.current.isMac).toBe(true);
    });

    it("should detect macOS from 'Mac68K'", () => {
      Object.defineProperty(navigator, "platform", {
        value: "Mac68K",
        configurable: true,
      });

      const { result } = renderHook(() => usePlatform());
      expect(result.current.isMac).toBe(true);
    });
  });

  describe("Windows detection", () => {
    it("should detect Windows from 'Win32'", () => {
      Object.defineProperty(navigator, "platform", {
        value: "Win32",
        configurable: true,
      });

      const { result } = renderHook(() => usePlatform());
      expect(result.current.isWindows).toBe(true);
      expect(result.current.isMac).toBe(false);
      expect(result.current.isLinux).toBe(false);
    });

    it("should detect Windows from 'Win64'", () => {
      Object.defineProperty(navigator, "platform", {
        value: "Win64",
        configurable: true,
      });

      const { result } = renderHook(() => usePlatform());
      expect(result.current.isWindows).toBe(true);
    });
  });

  describe("Linux detection", () => {
    it("should detect Linux from 'Linux x86_64'", () => {
      Object.defineProperty(navigator, "platform", {
        value: "Linux x86_64",
        configurable: true,
      });

      const { result } = renderHook(() => usePlatform());
      expect(result.current.isLinux).toBe(true);
      expect(result.current.isMac).toBe(false);
      expect(result.current.isWindows).toBe(false);
    });

    it("should detect Linux from 'Linux armv7l'", () => {
      Object.defineProperty(navigator, "platform", {
        value: "Linux armv7l",
        configurable: true,
      });

      const { result } = renderHook(() => usePlatform());
      expect(result.current.isLinux).toBe(true);
    });
  });

  describe("unknown platform", () => {
    it("should return all false for unknown platform", () => {
      Object.defineProperty(navigator, "platform", {
        value: "FreeBSD",
        configurable: true,
      });

      const { result } = renderHook(() => usePlatform());
      expect(result.current.isMac).toBe(false);
      expect(result.current.isWindows).toBe(false);
      expect(result.current.isLinux).toBe(false);
    });
  });

  describe("return shape", () => {
    it("should return an object with isMac, isWindows, isLinux", () => {
      const { result } = renderHook(() => usePlatform());
      expect(result.current).toHaveProperty("isMac");
      expect(result.current).toHaveProperty("isWindows");
      expect(result.current).toHaveProperty("isLinux");
    });

    it("should return boolean values", () => {
      const { result } = renderHook(() => usePlatform());
      expect(typeof result.current.isMac).toBe("boolean");
      expect(typeof result.current.isWindows).toBe("boolean");
      expect(typeof result.current.isLinux).toBe("boolean");
    });
  });
});

describe("useIsMac", () => {
  afterEach(() => {
    Object.defineProperty(navigator, "platform", {
      value: navigator.platform,
      configurable: true,
    });
  });

  it("should return true on macOS", () => {
    Object.defineProperty(navigator, "platform", {
      value: "MacIntel",
      configurable: true,
    });

    const { result } = renderHook(() => useIsMac());
    expect(result.current).toBe(true);
  });

  it("should return false on Windows", () => {
    Object.defineProperty(navigator, "platform", {
      value: "Win32",
      configurable: true,
    });

    const { result } = renderHook(() => useIsMac());
    expect(result.current).toBe(false);
  });

  it("should return false on Linux", () => {
    Object.defineProperty(navigator, "platform", {
      value: "Linux x86_64",
      configurable: true,
    });

    const { result } = renderHook(() => useIsMac());
    expect(result.current).toBe(false);
  });

  it("should return a boolean", () => {
    const { result } = renderHook(() => useIsMac());
    expect(typeof result.current).toBe("boolean");
  });
});
