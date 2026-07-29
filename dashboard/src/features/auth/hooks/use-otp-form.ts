import { useState } from "react";
import { useMutation } from "@apollo/client/react";
import {
  VerifySignUpOtpDocument,
  type VerifySignUpOtpMutation,
  type VerifySignUpOtpMutationVariables,
} from "@/graphql/definitions";
import { useTranslations } from "@/common/hooks/use-translations";
import { useErrorMessage } from "@/common/lib/errors/error-message";
import { isUnauthenticatedError } from "@/common/apollo/links/auth-error-link";
import { track } from "@/common/analytics";
import type { Token } from "@/common/types/token";

type UseOtpFormOptions = {
  sessionId: string;
  onSuccess: (token: Token) => void | Promise<void>;
};

export function useOtpForm({ sessionId, onSuccess }: UseOtpFormOptions) {
  const { t } = useTranslations();
  const formatError = useErrorMessage();
  const [serverError, setServerError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [verifySignUpOtp] = useMutation<
    VerifySignUpOtpMutation,
    VerifySignUpOtpMutationVariables
  >(VerifySignUpOtpDocument);

  const onSubmit = async (data: { otp: string }) => {
    setServerError("");

    if (!sessionId) {
      setServerError(t("auth.sessionExpired"));
      return;
    }

    setIsLoading(true);
    try {
      const response = await verifySignUpOtp({
        variables: { sessionId, otp: data.otp },
      });
      const responseData = response.data;
      if (responseData) {
        // Registration is complete only once the OTP is verified, so this is
        // where sign_up fires — counting verified accounts, not attempts.
        track("sign_up", { method: "password" });
        const token: Token = {
          accessToken: responseData.verifySignUpOtp.token,
          expiresAt: responseData.verifySignUpOtp.expireAt,
        };
        await onSuccess(token);
      } else {
        setServerError(t("auth.otpVerificationFailed"));
      }
    } catch (err: unknown) {
      // UNAUTHENTICATED here means a rejected code, not an expired session.
      setServerError(
        isUnauthenticatedError(err)
          ? t("auth.otpVerificationError")
          : formatError(err),
      );
    } finally {
      setIsLoading(false);
    }
  };

  return { onSubmit, isLoading, serverError };
}
