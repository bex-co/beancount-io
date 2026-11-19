import * as React from "react";
import { getUserAgent } from "@/common/lib/user-agent";

export const MOBILE_BREAKPOINT = 768;

const MOBILE_UA_REGEX =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

function detectMobileFromUA(): boolean {
  return MOBILE_UA_REGEX.test(getUserAgent());
}

/** Narrower than `breakpoint` (768 by default) once the viewport is known. */
export function useIsMobile(breakpoint = MOBILE_BREAKPOINT) {
  const [isMobile, setIsMobile] = React.useState<boolean>(detectMobileFromUA);

  React.useEffect(() => {
    // Without matchMedia (some test environments) the width alone decides.
    if (typeof window.matchMedia !== "function") {
      setIsMobile(window.innerWidth < breakpoint);
      return;
    }
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < breakpoint);
    return () => mql.removeEventListener("change", onChange);
  }, [breakpoint]);

  return isMobile;
}
