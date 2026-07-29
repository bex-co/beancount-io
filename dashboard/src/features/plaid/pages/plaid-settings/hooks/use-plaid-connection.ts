import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useErrorMessage } from "@/common/lib/errors/error-message";
import { usePlaidLinkToken } from "./use-plaid-link-token";
import { usePlaidLinkLauncher } from "./use-plaid-link-launcher";
import { usePlaidTokenExchange } from "./use-plaid-token-exchange";
import { PlaidLinkError } from "react-plaid-link";

enum FlowState {
  IDLE = "idle",
  CREATING_TOKEN = "creating_token",
  READY_TO_LAUNCH = "ready_to_launch",
  PLAID_OPEN = "plaid_open",
  EXCHANGING_TOKEN = "exchanging_token",
  SUCCESS = "success",
  ERROR = "error",
}

interface UsePlaidConnectionOptions {
  /**
   * The ledger to scope the new bank connection to.
   */
  ledgerId: string;
  /**
   * Optional custom error handler. If not provided, errors will be shown via toast notifications.
   */
  onError?: (error: Error) => void;
}

interface UsePlaidConnectionReturn {
  /**
   * Initiates the Plaid connection flow
   */
  connect: () => Promise<void>;
  /**
   * Whether the connection flow is currently in progress (loading)
   */
  isLoading: boolean;
  /**
   * Whether the connection was successful
   */
  isSuccess: boolean;
  /**
   * Current loading message to display
   */
  loadingMessage: string;
  /**
   * Current error, if any
   */
  error: Error | null;
}

/**
 * Hook for managing Plaid Link connection flow
 *
 * Flow:
 * 1. User calls `connect()` → Create link token
 * 2. Link token ready → Launch Plaid Link UI
 * 3. User completes Plaid flow → Exchange public token
 * 4. Success → Refresh bank accounts list
 *
 * @param options - Configuration
 * @param options.ledgerId - The ledger to scope the new bank connection to
 * @param options.onError - Custom error handler (defaults to toast notifications)
 *
 * @example
 * ```tsx
 * const { connect, isLoading, isSuccess } = usePlaidConnection({
 *   ledgerId,
 *   onError: (error) => console.error("Custom error handling", error)
 * });
 *
 * return <Button onClick={connect}>Connect Bank</Button>
 * ```
 */
export function usePlaidConnection(
  options: UsePlaidConnectionOptions,
): UsePlaidConnectionReturn {
  const { ledgerId, onError } = options;
  const formatError = useErrorMessage();
  const [flowState, setFlowState] = useState<FlowState>(FlowState.IDLE);

  // Step 1: Create link token (lazy - only when user calls connect)
  const {
    linkToken,
    createLinkToken,
    error: tokenError,
    reset: resetToken,
  } = usePlaidLinkToken();

  // Step 3: Exchange public token
  const { exchangePublicToken, error: exchangeError } = usePlaidTokenExchange();

  // Step 2: Launch Plaid Link
  const onPlaidSuccess = useCallback(
    async (publicToken: string) => {
      setFlowState(FlowState.EXCHANGING_TOKEN);
      try {
        await exchangePublicToken(ledgerId, publicToken);
        setFlowState(FlowState.SUCCESS);

        // Reset after success to allow connecting another account
        setTimeout(() => {
          resetToken();
          setFlowState(FlowState.IDLE);
        }, 100);
      } catch {
        setFlowState(FlowState.ERROR);
      }
    },
    [exchangePublicToken, resetToken, ledgerId],
  );

  const onPlaidExit = useCallback(
    (error: PlaidLinkError | null) => {
      // User closed Plaid Link without completing the connection
      // Reset flow state to allow them to try again
      resetToken();
      setFlowState(FlowState.IDLE);

      // Only show error toast if there was an actual error (not just user cancellation)
      if (error) {
        toast.error("Connection Cancelled", {
          description: error?.error_message || "Plaid Link was closed.",
          duration: 4000,
        });
      }
    },
    [resetToken],
  );

  const { openPlaidLink, ready: plaidReady } = usePlaidLinkLauncher(
    linkToken,
    onPlaidSuccess,
    onPlaidExit,
  );

  // Handle connect action - start the flow
  const connect = useCallback(async () => {
    if (flowState === FlowState.IDLE || flowState === FlowState.ERROR) {
      setFlowState(FlowState.CREATING_TOKEN);
      await createLinkToken(ledgerId);
      // Token will be set by the mutation's onCompleted callback
    }
  }, [flowState, createLinkToken, ledgerId]);

  // Auto-launch Plaid Link when token is ready
  useEffect(() => {
    if (linkToken && plaidReady) {
      if (flowState === FlowState.CREATING_TOKEN) {
        // Token just became ready, open Plaid Link
        openPlaidLink();
        // Note: We don't set PLAID_OPEN state here to avoid setState in effect
      }
    }
  }, [linkToken, plaidReady, flowState, openPlaidLink]);

  // Derive error state from error objects
  const error = tokenError || exchangeError;
  const hasError = !!error;
  const currentFlowState = hasError ? FlowState.ERROR : flowState;

  // Handle errors - use custom handler or default toast notifications
  useEffect(() => {
    if (error) {
      if (onError) {
        // Use custom error handler
        onError(error);
      } else {
        // Default: show toast notification
        // Check if it's a duplicate institution error
        const isDuplicateError = (error.message || "")
          .toLowerCase()
          .includes("already have an active connection");

        if (isDuplicateError) {
          // Extract institution name from error message if possible
          const match = (error.message || "").match(
            /active connection to (.+?)\. Please/,
          );
          const institutionName = match ? match[1] : "this institution";

          toast.error("Connection Already Exists", {
            description: `You already have an active connection to ${institutionName}. Please unlink the existing connection first.`,
            duration: 7000,
          });
        } else {
          // Generic error
          toast.error("Connection Failed", {
            description: formatError(error),
            duration: 6000,
          });
        }
      }

      // Reset flow state after showing error
      setTimeout(() => {
        resetToken();
        setFlowState(FlowState.IDLE);
      }, 500);
    }
  }, [error, onError, resetToken, formatError]);

  // Derive loading state based on flow state (not individual loading flags)
  // This ensures loading is shown during the entire flow, including the gap
  // between creatingToken and exchangingToken when Plaid Link UI is open
  const isLoading =
    currentFlowState === FlowState.CREATING_TOKEN ||
    currentFlowState === FlowState.READY_TO_LAUNCH ||
    currentFlowState === FlowState.PLAID_OPEN ||
    currentFlowState === FlowState.EXCHANGING_TOKEN;
  const isSuccess = currentFlowState === FlowState.SUCCESS;

  // Determine loading message based on flow state
  let loadingMessage = "Connecting...";
  if (currentFlowState === FlowState.CREATING_TOKEN) {
    loadingMessage = "Preparing...";
  } else if (
    currentFlowState === FlowState.READY_TO_LAUNCH ||
    currentFlowState === FlowState.PLAID_OPEN
  ) {
    loadingMessage = "Waiting for authorization...";
  } else if (currentFlowState === FlowState.EXCHANGING_TOKEN) {
    loadingMessage = "Finalizing...";
  }

  return {
    connect,
    isLoading,
    isSuccess,
    loadingMessage,
    error,
  };
}
