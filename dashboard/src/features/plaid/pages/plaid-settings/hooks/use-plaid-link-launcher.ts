import {
  usePlaidLink as usePlaidLinkSDK,
  PlaidLinkOnExit,
} from "react-plaid-link";
import { useCallback } from "react";

/**
 * Hook for launching Plaid Link UI with a link token
 * Wraps react-plaid-link SDK
 */
export function usePlaidLinkLauncher(
  linkToken: string | null,
  onSuccess: (publicToken: string) => void | Promise<void>,
  onExit?: PlaidLinkOnExit,
) {
  const config = {
    token: linkToken,
    onSuccess,
    onExit,
  };

  const { open, ready, error } = usePlaidLinkSDK(config);

  const openPlaidLink = useCallback(() => {
    if (ready && linkToken) {
      open();
    }
  }, [ready, linkToken, open]);

  return {
    openPlaidLink,
    ready: ready && !!linkToken,
    error,
  };
}
