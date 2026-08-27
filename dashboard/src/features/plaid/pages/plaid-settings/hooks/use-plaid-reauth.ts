import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useErrorMessage } from "@/common/lib/errors/error-message";
import { useMutation } from "@apollo/client/react";
import { usePlaidUpdateModeLinkToken } from "./use-plaid-update-mode-link-token";
import { usePlaidLinkLauncher } from "./use-plaid-link-launcher";
import { PlaidLinkError } from "react-plaid-link";
import {
  GetPlaidAccountsDocument,
  RefreshPlaidItemStatusDocument,
  ReconcilePlaidAccountsDocument,
  type RefreshPlaidItemStatusMutation,
  type RefreshPlaidItemStatusMutationVariables,
  type ReconcilePlaidAccountsMutation,
  type ReconcilePlaidAccountsMutationVariables,
} from "@/graphql/definitions";
import { useTranslations } from "@/common/hooks/use-translations";

enum ReauthFlowState {
  IDLE = "idle",
  CREATING_TOKEN = "creating_token",
  READY_TO_LAUNCH = "ready_to_launch",
  PLAID_OPEN = "plaid_open",
  REFRESHING_STATUS = "refreshing_status",
  SUCCESS = "success",
  ERROR = "error",
}

interface UsePlaidReauthOptions {
  /**
   * Item ID to reauthenticate
   */
  itemId: string;
  /**
   * The ledger the item belongs to
   */
  ledgerId: string;
  /**
   * Optional custom error handler. If not provided, errors will be shown via toast notifications.
   */
  onError?: (error: Error) => void;
  /**
   * Optional success callback after successful reauthentication
   */
  onSuccess?: () => void | Promise<void>;
}

interface UsePlaidReauthReturn {
  /**
   * Initiates the Plaid reauthentication flow
   */
  reconnect: () => Promise<void>;
  /**
   * Whether the reauthentication flow is currently in progress (loading)
   */
  isLoading: boolean;
  /**
   * Whether the reauthentication was successful
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
 * Hook for managing Plaid Link reauthentication flow (update mode)
 *
 * Flow:
 * 1. User calls `reconnect()` → Create update mode link token
 * 2. Link token ready → Launch Plaid Link UI in update mode
 * 3. User completes Plaid flow → Success (Plaid automatically updates the item)
 * 4. Refresh to get updated item status
 *
 * @param options - Configuration options
 * @param options.itemId - The Plaid Item ID to reauthenticate
 * @param options.ledgerId - The ledger the item belongs to
 * @param options.onError - Custom error handler (defaults to toast notifications)
 * @param options.onSuccess - Success callback after reauthentication
 *
 * @example
 * ```tsx
 * const { reconnect, isLoading, isSuccess } = usePlaidReauth({
 *   itemId: "pitm_abc123",
 *   ledgerId,
 *   onSuccess: () => {
 *     console.log("Reauthentication successful!");
 *     refetch(); // Refresh item data
 *   }
 * });
 *
 * return <Button onClick={reconnect}>Reconnect</Button>
 * ```
 */
export function usePlaidReauth(
  options: UsePlaidReauthOptions,
): UsePlaidReauthReturn {
  const { itemId, ledgerId, onError, onSuccess } = options;
  const formatError = useErrorMessage();
  const { t } = useTranslations();
  const reconnectedTitle = t("plaid.reauth.reconnected");
  const reconnectedDescription = t("plaid.reauth.reconnectedDescription");
  const statusUpdateFailed = t("plaid.reauth.statusUpdateFailed");
  const statusUpdateFailedDescription = t(
    "plaid.reauth.statusUpdateFailedDescription",
  );
  const [flowState, setFlowState] = useState<ReauthFlowState>(
    ReauthFlowState.IDLE,
  );

  // Step 1: Create update mode link token (lazy - only when user calls reconnect)
  const {
    linkToken,
    createUpdateModeLinkToken,
    error: tokenError,
    reset: resetToken,
  } = usePlaidUpdateModeLinkToken();

  // Step 2: Refresh item status mutation
  const [refreshItemStatus, { error: refreshError }] = useMutation<
    RefreshPlaidItemStatusMutation,
    RefreshPlaidItemStatusMutationVariables
  >(RefreshPlaidItemStatusDocument);

  // Step 2b: Reconcile accounts. At most OAuth institutions, update mode always
  // shows Plaid's Account Select pane regardless of what we asked for, so a
  // plain reconnect can silently change which accounts are shared. Without this
  // our stored account list drifts away from Plaid's.
  const [reconcileAccounts] = useMutation<
    ReconcilePlaidAccountsMutation,
    ReconcilePlaidAccountsMutationVariables
  >(ReconcilePlaidAccountsDocument, {
    refetchQueries: [GetPlaidAccountsDocument],
  });

  // Step 3: Handle successful reauthentication
  // Note: In update mode, Plaid automatically updates the item when the user completes
  // the reauthentication flow. However, the LOGIN_REPAIRED webhook is NOT sent immediately.
  // We need to manually fetch the item status from Plaid to get the updated state.
  const onPlaidSuccess = useCallback(async () => {
    setFlowState(ReauthFlowState.REFRESHING_STATUS);

    try {
      // Fetch latest item status from Plaid and update our database
      await refreshItemStatus({
        variables: { itemId, ledgerId },
      });

      // Best-effort: a reconnect that worked must never be reported as failed
      // just because the follow-up account reconcile did not. A missed
      // reconcile self-heals — the next transaction sync re-adds any newly
      // shared account.
      try {
        await reconcileAccounts({ variables: { itemId, ledgerId } });
      } catch (reconcileErr) {
        console.error(
          "Failed to reconcile accounts after reauth:",
          reconcileErr,
        );
      }

      setFlowState(ReauthFlowState.SUCCESS);

      // Call optional success callback
      if (onSuccess) {
        await onSuccess();
      }

      toast.success(reconnectedTitle, {
        description: reconnectedDescription,
        duration: 4000,
      });
    } catch {
      setFlowState(ReauthFlowState.ERROR);
      toast.error(statusUpdateFailed, {
        description: statusUpdateFailedDescription,
        duration: 6000,
      });
    }

    // Reset after success to allow reconnecting again if needed
    setTimeout(() => {
      resetToken();
      setFlowState(ReauthFlowState.IDLE);
    }, 100);
  }, [
    onSuccess,
    resetToken,
    refreshItemStatus,
    reconcileAccounts,
    itemId,
    ledgerId,
    reconnectedDescription,
    reconnectedTitle,
    statusUpdateFailed,
    statusUpdateFailedDescription,
  ]);

  const onPlaidExit = useCallback(
    (error: PlaidLinkError | null) => {
      // User closed Plaid Link without completing the reauthentication
      // Reset flow state to allow them to try again
      resetToken();
      setFlowState(ReauthFlowState.IDLE);

      // Only show error toast if there was an actual error (not just user cancellation)
      if (error) {
        toast.error(t("plaid.reauth.cancelled"), {
          description: error?.error_message || t("plaid.reauth.linkClosed"),
          duration: 4000,
        });
      }
    },
    [resetToken, t],
  );

  const { openPlaidLink, ready: plaidReady } = usePlaidLinkLauncher(
    linkToken,
    onPlaidSuccess,
    onPlaidExit,
  );

  // Handle reconnect action - start the flow
  const reconnect = useCallback(async () => {
    if (
      flowState === ReauthFlowState.IDLE ||
      flowState === ReauthFlowState.ERROR
    ) {
      setFlowState(ReauthFlowState.CREATING_TOKEN);
      await createUpdateModeLinkToken(ledgerId, itemId);
      // Token will be set by the mutation's onCompleted callback
    }
  }, [flowState, createUpdateModeLinkToken, itemId, ledgerId]);

  // Auto-launch Plaid Link when token is ready
  useEffect(() => {
    if (linkToken && plaidReady) {
      if (flowState === ReauthFlowState.CREATING_TOKEN) {
        // Token just became ready, open Plaid Link
        openPlaidLink();
        // Note: We don't set PLAID_OPEN state here to avoid setState in effect
      }
    }
  }, [linkToken, plaidReady, flowState, openPlaidLink]);

  // Derive error state from error objects
  const error = tokenError || refreshError;
  const hasError = !!error;
  const currentFlowState = hasError ? ReauthFlowState.ERROR : flowState;

  // Handle errors - use custom handler or default toast notifications
  useEffect(() => {
    if (error) {
      if (onError) {
        // Use custom error handler
        onError(error);
      } else {
        // Default: show toast notification
        toast.error(t("plaid.reauth.failed"), {
          description: formatError(error),
          duration: 6000,
        });
      }

      // Reset flow state after showing error
      setTimeout(() => {
        resetToken();
        setFlowState(ReauthFlowState.IDLE);
      }, 500);
    }
  }, [error, onError, resetToken, formatError, t]);

  // Derive loading state based on flow state
  const isLoading =
    currentFlowState === ReauthFlowState.CREATING_TOKEN ||
    currentFlowState === ReauthFlowState.READY_TO_LAUNCH ||
    currentFlowState === ReauthFlowState.PLAID_OPEN ||
    currentFlowState === ReauthFlowState.REFRESHING_STATUS;
  const isSuccess = currentFlowState === ReauthFlowState.SUCCESS;

  // Determine loading message based on flow state
  let loadingMessage = t("plaid.reauth.reconnecting");
  if (currentFlowState === ReauthFlowState.CREATING_TOKEN) {
    loadingMessage = t("plaid.connection.preparing");
  } else if (
    currentFlowState === ReauthFlowState.READY_TO_LAUNCH ||
    currentFlowState === ReauthFlowState.PLAID_OPEN
  ) {
    loadingMessage = t("plaid.connection.waitingForAuthorization");
  } else if (currentFlowState === ReauthFlowState.REFRESHING_STATUS) {
    loadingMessage = t("plaid.reauth.updatingStatus");
  }

  return {
    reconnect,
    isLoading,
    isSuccess,
    loadingMessage,
    error: error ?? null,
  };
}
