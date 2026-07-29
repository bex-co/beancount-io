import { createContext, useContext } from "react";

/**
 * React Native Context
 *
 * Provides information about whether the app is running in a React Native webview.
 */
export interface ReactNativeContextValue {
  /**
   * Whether the app is currently running inside a React Native webview
   */
  isReactNative: boolean;
}

export const ReactNativeContext = createContext<
  ReactNativeContextValue | undefined
>(undefined);

/**
 * Hook to access React Native context
 *
 * @returns Context value with isReactNative flag
 * @throws Error if used outside ReactNativeBridgeProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isReactNative } = useReactNativeContext();
 *
 *   if (isReactNative) {
 *     return <MobileOptimizedView />;
 *   }
 *
 *   return <WebView />;
 * }
 * ```
 */
export function useReactNativeContext(): ReactNativeContextValue {
  const context = useContext(ReactNativeContext);

  if (context === undefined) {
    throw new Error(
      "useReactNativeContext must be used within ReactNativeBridgeProvider",
    );
  }

  return context;
}
