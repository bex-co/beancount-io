import { useMutation } from "@apollo/client/react";
import {
  CreateStripePortalSessionDocument,
  type CreateStripePortalSessionMutation,
} from "@/graphql/definitions";
import { toast } from "sonner";
import { useTranslations } from "@/common/hooks/use-translations";
import { useErrorMessage } from "@/common/lib/errors/error-message";

export const useSubscriptionPortal = () => {
  const { t } = useTranslations();
  const formatError = useErrorMessage();
  const [createStripePortalSession, { loading }] =
    useMutation<CreateStripePortalSessionMutation>(
      CreateStripePortalSessionDocument,
    );

  const handleManageBilling = async (clientId: string) => {
    try {
      const response = await createStripePortalSession({
        variables: { clientId },
      });
      const result = response.data?.createStripePortalSession;
      if (result?.success && result.sessionUrl) {
        window.location.href = result.sessionUrl;
      } else {
        toast.error(
          result?.message || t("userSettings.unableToOpenBillingPortal"),
        );
      }
    } catch (error) {
      toast.error(formatError(error));
    }
  };

  return { handleManageBilling, loading };
};
