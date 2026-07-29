import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";
import { ReactNativeBridgeProvider } from "../react-native-bridge-provider";
import { useReactNativeContext } from "../react-native-bridge-context";
import * as reactNativeBridge from "../react-native-bridge";

// Mock the react-native-bridge module
vi.mock("../react-native-bridge", () => ({
  initReactNativeBridge: vi.fn(),
  isReactNative: vi.fn(() => false),
  waitForReactNative: vi.fn(() => Promise.resolve(false)),
}));

describe("ReactNativeBridgeProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render children", () => {
    const { getByText } = render(
      <ReactNativeBridgeProvider>
        <div>Test Child</div>
      </ReactNativeBridgeProvider>,
    );

    expect(getByText("Test Child")).toBeInTheDocument();
  });

  it("should initialize the React Native bridge on mount", () => {
    const initSpy = vi.spyOn(reactNativeBridge, "initReactNativeBridge");

    render(
      <ReactNativeBridgeProvider>
        <div>Test</div>
      </ReactNativeBridgeProvider>,
    );

    expect(initSpy).toHaveBeenCalledTimes(1);
  });

  it("should only initialize bridge once even with multiple children", () => {
    const initSpy = vi.spyOn(reactNativeBridge, "initReactNativeBridge");

    render(
      <ReactNativeBridgeProvider>
        <div>Child 1</div>
        <div>Child 2</div>
        <div>Child 3</div>
      </ReactNativeBridgeProvider>,
    );

    expect(initSpy).toHaveBeenCalledTimes(1);
  });

  it("should not re-initialize on re-render", () => {
    const initSpy = vi.spyOn(reactNativeBridge, "initReactNativeBridge");

    const { rerender } = render(
      <ReactNativeBridgeProvider>
        <div>Original</div>
      </ReactNativeBridgeProvider>,
    );

    expect(initSpy).toHaveBeenCalledTimes(1);

    rerender(
      <ReactNativeBridgeProvider>
        <div>Updated</div>
      </ReactNativeBridgeProvider>,
    );

    // Should still only be called once
    expect(initSpy).toHaveBeenCalledTimes(1);
  });

  it("should render null children correctly", () => {
    const { container } = render(
      <ReactNativeBridgeProvider>{null}</ReactNativeBridgeProvider>,
    );

    expect(container.firstChild).toBeNull();
  });

  it("should render fragment children correctly", () => {
    const { getByText } = render(
      <ReactNativeBridgeProvider>
        <>
          <div>Fragment Child 1</div>
          <div>Fragment Child 2</div>
        </>
      </ReactNativeBridgeProvider>,
    );

    expect(getByText("Fragment Child 1")).toBeInTheDocument();
    expect(getByText("Fragment Child 2")).toBeInTheDocument();
  });

  describe("useReactNativeContext", () => {
    it("should provide isReactNative context value", () => {
      let contextValue: { isReactNative: boolean } | null = null;

      function TestComponent() {
        contextValue = useReactNativeContext();
        return <div>Test</div>;
      }

      render(
        <ReactNativeBridgeProvider>
          <TestComponent />
        </ReactNativeBridgeProvider>,
      );

      expect(contextValue).not.toBeNull();
      expect(contextValue).toHaveProperty("isReactNative");
      expect(typeof contextValue?.isReactNative).toBe("boolean");
    });

    it("should return false when not in React Native webview", () => {
      let contextValue: { isReactNative: boolean } | null = null;

      vi.spyOn(reactNativeBridge, "isReactNative").mockReturnValue(false);

      function TestComponent() {
        contextValue = useReactNativeContext();
        return <div>Test</div>;
      }

      render(
        <ReactNativeBridgeProvider>
          <TestComponent />
        </ReactNativeBridgeProvider>,
      );

      expect(contextValue?.isReactNative).toBe(false);
    });

    it("should return true when in React Native webview", async () => {
      let contextValue: { isReactNative: boolean } | null = null;

      vi.spyOn(reactNativeBridge, "waitForReactNative").mockResolvedValue(true);

      function TestComponent() {
        contextValue = useReactNativeContext();
        return <div>Test</div>;
      }

      await act(async () => {
        render(
          <ReactNativeBridgeProvider>
            <TestComponent />
          </ReactNativeBridgeProvider>,
        );
        // Wait a tick for the promise to resolve and state to update
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Now check the value
      expect(contextValue?.isReactNative).toBe(true);
    });

    it("should throw error when used outside provider", () => {
      function TestComponent() {
        useReactNativeContext();
        return <div>Test</div>;
      }

      // Suppress console.error for this test
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      expect(() => render(<TestComponent />)).toThrow(
        "useReactNativeContext must be used within ReactNativeBridgeProvider",
      );

      consoleError.mockRestore();
    });

    it("should provide same context value to multiple consumers", async () => {
      const contextValues: Array<{ isReactNative: boolean }> = [];

      function TestComponent({ id }: { id: number }) {
        const context = useReactNativeContext();
        contextValues[id] = context;
        return <div>Test {id}</div>;
      }

      await act(async () => {
        render(
          <ReactNativeBridgeProvider>
            <TestComponent id={0} />
            <TestComponent id={1} />
            <TestComponent id={2} />
          </ReactNativeBridgeProvider>,
        );
        // Wait for any async state updates
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(contextValues).toHaveLength(3);
      expect(contextValues[0]).toEqual(contextValues[1]);
      expect(contextValues[1]).toEqual(contextValues[2]);
    });
  });
});
