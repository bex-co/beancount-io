import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useErrorMessage } from "@/common/lib/errors/error-message";
import { useTranslations } from "@/common/hooks/use-translations";
import { useMutation } from "@apollo/client/react";
import { usePlaidUpdateModeLinkToken } from "./use-plaid-update-mode-link-token";
import { usePlaidLinkLauncher } from "./use-plaid-link-launcher";
import { PlaidLinkError } from "react-plaid-link";
import {
  GetPlaidAccountsDocument,
  ReconcilePlaidAccountsDocument,
  type ReconcilePlaidAccountsMutation,
  type ReconcilePlaidAccountsMutationVariables,
} from "@/graphql/definitions";

enum ManageAccountsFlowState {
  IDLE = "idle",
  CREATING_TOKEN = "creating_token",
  READY_TO_LAUNCH = "ready_to_launch",
  PLAID_OPEN = "plaid_open",
  RECONCILING = "reconciling",
  SUCCESS = "success",
  ERROR = "error",
}

export interface PlaidAccountReconcileSummary {
  addedCount: number;
  removedCount: number;
}

interface UsePlaidManageAccountsOptions {
  /** Item whose shared accounts the user wants to change */
  itemId: string;
  /** The ledger the item belongs to */
  ledgerId: string;
  /** Optional custom error handler. Defaults to a toast notification. */
  onError?: (error: Error) => void;
  /** Called with the reconcile counts once the accounts have been updated */
  onSuccess?: (summary: PlaidAccountReconcileSummary) => void | Promise<void>;
}

interface UsePlaidManageAccountsReturn {
  /** Opens Plaid Link with the Account Select pane */
  manageAccounts: () => Promise<void>;
  isLoading: boolean;
  isSuccess: boolean;
  loadingMessage: string;
  error: Error | null;
}

/**
 * Hook for adding or removing accounts under an already-linked institution.
 *
 * Flow:
 * 1. User calls `manageAccounts()` → create an update mode link token with
 *    Account Select requested
 * 2. Token ready → launch Plaid Link, which shows the account selection pane
 * 3. User confirms their selection → reconcile our accounts against Plaid
 *
 * Reconciling deletes accounts Plaid no longer shares, along with their stored
 * transactions. That is only safe because it runs immediately after the user
 * has explicitly confirmed a selection in Plaid's own UI — never wire the
 * reconcile call to an unattended trigger.
 */
export function usePlaidManageAccounts(
  options: UsePlaidManageAccountsOptions,
): UsePlaidManageAccountsReturn {
  const { itemId, ledgerId, onError, onSuccess } = options;
  const { t } = useTranslations();
  const formatError = useErrorMessage();
  const [flowState, setFlowState] = useState<ManageAccountsFlowState>(
    ManageAccountsFlowState.IDLE,
  );

  const {
    linkToken,
    createUpdateModeLinkToken,
    error: tokenError,
    reset: resetToken,
  } = usePlaidUpdateModeLinkToken();

  const [reconcileAccounts, { error: reconcileError }] = useMutation<
    ReconcilePlaidAccountsMutation,
    ReconcilePlaidAccountsMutationVariables
  >(ReconcilePlaidAccountsDocument, {
    refetchQueries: [GetPlaidAccountsDocument],
  });

  // Update mode does not issue an exchangeable public token, so the argument
  // Plaid hands us here is deliberately ignored. The `metadata.accounts` array
  // is client-side data and equally untrustworthy — the server's own
  // /accounts/get read is the only source of truth.
  const onPlaidSuccess = useCallback(async () => {
    setFlowState(ManageAccountsFlowState.RECONCILING);

    try {
      const { data } = await reconcileAccounts({
        variables: { itemId, ledgerId },
      });

      setFlowState(ManageAccountsFlowState.SUCCESS);

      const summary = {
        addedCount: data?.reconcilePlaidAccounts.addedCount ?? 0,
        removedCount: data?.reconcilePlaidAccounts.removedCount ?? 0,
      };

      if (onSuccess) {
        await onSuccess(summary);
      }

      if (summary.addedCount === 0 && summary.removedCount === 0) {
        // Some institutions complete update mode without ever showing the
        // Account Select pane. Saying so beats a silent no-op.
        toast.info(t("plaid.accountMapping.manageAccountsNoChangesTitle"), {
          description: t("plaid.accountMapping.manageAccountsNoChanges"),
          duration: 6000,
        });
      } else {
        toast.success(t("plaid.accountMapping.manageAccountsUpdatedTitle"), {
          description: t("plaid.accountMapping.manageAccountsUpdated", {
            added: summary.addedCount,
            removed: summary.removedCount,
          }),
          duration: 4000,
        });
      }
    } catch {
      setFlowState(ManageAccountsFlowState.ERROR);
      toast.error(t("plaid.accountMapping.manageAccountsFailedTitle"), {
        description: t("plaid.accountMapping.manageAccountsFailed"),
        duration: 6000,
      });
    }

    setTimeout(() => {
      resetToken();
      setFlowState(ManageAccountsFlowState.IDLE);
    }, 100);
  }, [onSuccess, resetToken, reconcileAccounts, itemId, ledgerId, t]);

  const onPlaidExit = useCallback(
    (error: PlaidLinkError | null) => {
      // Deliberately does NOT reconcile: the user backed out, so nothing about
      // their account selection was confirmed and nothing should be deleted.
      resetToken();
      setFlowState(ManageAccountsFlowState.IDLE);

      if (error) {
        toast.error(t("plaid.accountMapping.manageAccountsCancelledTitle"), {
          description:
            error?.error_message ||
            t("plaid.accountMapping.manageAccountsCancelled"),
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

  const manageAccounts = useCallback(async () => {
    if (
      flowState === ManageAccountsFlowState.IDLE ||
      flowState === ManageAccountsFlowState.ERROR
    ) {
      setFlowState(ManageAccountsFlowState.CREATING_TOKEN);
      await createUpdateModeLinkToken(ledgerId, itemId, true);
    }
  }, [flowState, createUpdateModeLinkToken, itemId, ledgerId]);

  useEffect(() => {
    if (linkToken && plaidReady) {
      if (flowState === ManageAccountsFlowState.CREATING_TOKEN) {
        openPlaidLink();
      }
    }
  }, [linkToken, plaidReady, flowState, openPlaidLink]);

  const error = tokenError || reconcileError;
  const hasError = !!error;
  const currentFlowState = hasError ? ManageAccountsFlowState.ERROR : flowState;

  useEffect(() => {
    if (error) {
      if (onError) {
        onError(error);
      } else {
        toast.error(t("plaid.accountMapping.manageAccountsFailedTitle"), {
          description: formatError(error),
          duration: 6000,
        });
      }

      setTimeout(() => {
        resetToken();
        setFlowState(ManageAccountsFlowState.IDLE);
      }, 500);
    }
  }, [error, onError, resetToken, formatError, t]);

  const isLoading =
    currentFlowState === ManageAccountsFlowState.CREATING_TOKEN ||
    currentFlowState === ManageAccountsFlowState.READY_TO_LAUNCH ||
    currentFlowState === ManageAccountsFlowState.PLAID_OPEN ||
    currentFlowState === ManageAccountsFlowState.RECONCILING;
  const isSuccess = currentFlowState === ManageAccountsFlowState.SUCCESS;

  let loadingMessage = t("plaid.accountMapping.manageAccountsLoading");
  if (currentFlowState === ManageAccountsFlowState.CREATING_TOKEN) {
    loadingMessage = t("plaid.accountMapping.manageAccountsPreparing");
  } else if (
    currentFlowState === ManageAccountsFlowState.READY_TO_LAUNCH ||
    currentFlowState === ManageAccountsFlowState.PLAID_OPEN
  ) {
    loadingMessage = t("plaid.accountMapping.manageAccountsWaiting");
  } else if (currentFlowState === ManageAccountsFlowState.RECONCILING) {
    loadingMessage = t("plaid.accountMapping.manageAccountsReconciling");
  }

  return {
    manageAccounts,
    isLoading,
    isSuccess,
    loadingMessage,
    error: error ?? null,
  };
}
