import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";

import { sessionVar } from "@/common/vars";

/**
 * Whether a session existed when this screen was last shown, for the signed-out
 * routes that must turn a signed-in arrival (a deep link, a stale URL) away.
 *
 * Deliberately not reactive. Native sign-in completes while Welcome is still
 * focused, and `finalizeOAuthSignIn` owns the navigation that follows: it
 * selects a ledger and opens a pending app link before leaving. Redirecting the
 * moment the session appears would race it into the tabs first.
 */
export function useSignedInOnArrival(): boolean {
  const [signedIn, setSignedIn] = useState(() => Boolean(sessionVar()));
  useFocusEffect(
    useCallback(() => {
      setSignedIn(Boolean(sessionVar()));
    }, []),
  );
  return signedIn;
}
