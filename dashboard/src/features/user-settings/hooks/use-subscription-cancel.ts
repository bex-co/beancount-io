import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import {
  CancelSubscriptionDocument,
  type CancelSubscriptionMutation,
  GetSubscriptionStatusDocument,
  type GetSubscriptionStatusQuery,
} from "@/graphql/definitions";
import { toast } from "sonner";
import { useTranslations } from "@/common/hooks/use-translations";
import { useErrorMessage } from "@/common/lib/errors/error-message";

export const useSubscriptionCancel = () => {
  const { t } = useTranslations();
  const formatError = useErrorMessage();
  const { refetch: refetchSubscription } = useQuery<GetSubscriptionStatusQuery>(
    GetSubscriptionStatusDocument,
  );
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<{
    id: string;
    clientId: string;
    endDate: string;
  } | null>(null);

  const [cancelSubscription, { loading }] =
    useMutation<CancelSubscriptionMutation>(CancelSubscriptionDocument);

  const handleCancelClick = (
    subscriptionId: string,
    clientId: string,
    endDate: string,
  ) => {
    setSelectedSubscription({ id: subscriptionId, clientId, endDate });
    setShowCancelDialog(true);
  };

  const handleCancelConfirm = async () => {
    if (!selectedSubscription) return;
    try {
      const response = await cancelSubscription({
        variables: {
          subscriptionId: selectedSubscription.id,
          clientId: selectedSubscription.clientId,
        },
      });
      const result = response.data?.cancelSubscription;
      if (result?.success) {
        toast.success(t("userSettings.subscriptionCanceledSuccess"));
        await refetchSubscription();
      } else {
        toast.error(
          result?.message || t("userSettings.failedToCancelSubscription"),
        );
      }
    } catch (error) {
      toast.error(formatError(error));
    } finally {
      setShowCancelDialog(false);
      setSelectedSubscription(null);
    }
  };

  return {
    loading,
    showCancelDialog,
    setShowCancelDialog,
    selectedSubscription,
    handleCancelClick,
    handleCancelConfirm,
  };
};
