import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { APP_MARKER_PARAM } from "@/common/lib/app-session";
import { useHidesBilling } from "../use-hides-billing";

const { mockNative } = vi.hoisted(() => ({
  mockNative: { isReactNative: false },
}));
vi.mock(
  "@/common/providers/react-native-bridge-provider/react-native-bridge-context",
  () => ({ useReactNativeContext: () => mockNative }),
);

beforeEach(() => {
  mockNative.isReactNative = false;
  window.sessionStorage.clear();
  window.history.replaceState(null, "", "/");
});

describe("useHidesBilling", () => {
  it("shows billing to an ordinary browser", () => {
    expect(renderHook(useHidesBilling).result.current).toBe(false);
  });

  it("hides it in the app's web view", () => {
    mockNative.isReactNative = true;

    expect(renderHook(useHidesBilling).result.current).toBe(true);
  });

  it("hides it on a page an app opened", () => {
    window.history.replaceState(null, "", `/?${APP_MARKER_PARAM}=1`);

    expect(renderHook(useHidesBilling).result.current).toBe(true);
  });
});
