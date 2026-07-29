import { useMemo } from "react";

/**
 * Custom hook to detect the user's platform
 * @returns Object with platform detection flags
 */
export function usePlatform() {
  return useMemo(() => {
    const isMac =
      typeof navigator !== "undefined" && /Mac/.test(navigator.platform);
    const isWindows =
      typeof navigator !== "undefined" && /Win/.test(navigator.platform);
    const isLinux =
      typeof navigator !== "undefined" && /Linux/.test(navigator.platform);

    return {
      isMac,
      isWindows,
      isLinux,
    };
  }, []);
}

/**
 * Custom hook to check if the user is on macOS
 * @returns true if on macOS, false otherwise
 */
export function useIsMac(): boolean {
  return usePlatform().isMac;
}
