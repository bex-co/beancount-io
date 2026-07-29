import { useEffect, useState } from "react";
import { waitForReactNative } from "./react-native-bridge";
import {
  ReactNativeContext,
  type ReactNativeContextValue,
} from "./react-native-bridge-context";
import { BridgeInitializer } from "./bridge-initializer";

/**
 * React Native Bridge Provider
 *
 * Provides context about the React Native environment.
 *
 * This component should be rendered once at the root level of the application.
 * The bridge initialization is handled by BridgeInitializer component which
 * must be rendered inside ThemeProvider.
 *
 * The provider exposes a context that indicates whether the app is
 * running in a React Native webview, which can be accessed via the
 * useReactNativeContext hook.
 *
 * @example
 * ```tsx
 * <ReactNativeBridgeProvider>
 *   <ThemeProvider>
 *     <BridgeInitializer />
 *     <App />
 *   </ThemeProvider>
 * </ReactNativeBridgeProvider>
 * ```
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isReactNative } = useReactNativeContext();
 *
 *   return (
 *     <div>
 *       {isReactNative ? 'Running in React Native' : 'Running in browser'}
 *     </div>
 *   );
 * }
 * ```
 */
export function ReactNativeBridgeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Start with false (assume web browser), will update if React Native detected
  const [isReactNative, setIsReactNative] = useState<boolean>(false);

  useEffect(() => {
    // Asynchronously detect React Native with polling
    void waitForReactNative().then((detected) => {
      setIsReactNative(detected);
    });
  }, []);

  const contextValue: ReactNativeContextValue = {
    isReactNative,
  };

  return (
    <ReactNativeContext.Provider value={contextValue}>
      <BridgeInitializer />
      {children}
    </ReactNativeContext.Provider>
  );
}
