import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import {
  ResumeSubscriptionDocument,
  type ResumeSubscriptionMutation,
  GetSubscriptionStatusDocument,
  type GetSubscriptionStatusQuery,
} from "@/graphql/definitions";
import { toast } from "sonner";
import { useTranslations } from "@/common/hooks/use-translations";
import { useErrorMessage } from "@/common/lib/errors/error-message";

export const useSubscriptionResume = () => {
  const { t } = useTranslations();
  const formatError = useErrorMessage();
  const { refetch: refetchSubscription } = useQuery<GetSubscriptionStatusQuery>(
    GetSubscriptionStatusDocument,
  );
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [selectedResumeSubscription, setSelectedResumeSubscription] = useState<{
    id: string;
    clientId: string;
    renewalDate: string;
  } | null>(null);

  const [resumeSubscription, { loading }] =
    useMutation<ResumeSubscriptionMutation>(ResumeSubscriptionDocument);

  const handleResumeClick = (
    subscriptionId: string,
    clientId: string,
    renewalDate: string,
  ) => {
    setSelectedResumeSubscription({
      id: subscriptionId,
      clientId,
      renewalDate,
    });
    setShowResumeDialog(true);
  };

  const handleResumeConfirm = async () => {
    if (!selectedResumeSubscription) return;
    try {
      const response = await resumeSubscription({
        variables: {
          subscriptionId: selectedResumeSubscription.id,
          clientId: selectedResumeSubscription.clientId,
        },
      });
      const result = response.data?.resumeSubscription;
      if (result?.success) {
        toast.success(t("userSettings.subscriptionResumedSuccess"));
        await refetchSubscription();
      } else {
        toast.error(
          result?.message || t("userSettings.failedToResumeSubscription"),
        );
      }
    } catch (error) {
      toast.error(formatError(error));
    } finally {
      setShowResumeDialog(false);
      setSelectedResumeSubscription(null);
    }
  };

  return {
    loading,
    showResumeDialog,
    setShowResumeDialog,
    selectedResumeSubscription,
    handleResumeClick,
    handleResumeConfirm,
  };
};
