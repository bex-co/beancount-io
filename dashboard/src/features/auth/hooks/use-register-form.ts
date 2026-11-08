import { useState } from "react";
import { useMutation } from "@apollo/client/react";
import {
  SignUpDocument,
  type SignUpMutation,
  type SignUpMutationVariables,
} from "@/graphql/definitions";
import { useTranslations } from "@/common/hooks/use-translations";
import { generateDefaultUsername } from "@/common/lib/utils/nanoid-base58";
import { track } from "@/common/analytics";
import { useNewPasswordErrorMessage } from "@/features/auth/lib/password-rule";

export type RegisterFormData = {
  firstName?: string;
  lastName?: string;
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
};

type UseRegisterFormOptions = {
  withDefaultLedger?: boolean;
  inviteSrc?: string;
  inviteBy?: string;
  onSuccess: (sessionId: string, email: string) => void;
  /**
   * A self-hosted deployment verifies no email: the sign-up answers already
   * signed in, so there is no code to enter and `onSuccess` is not called.
   */
  onSignedIn: (accessToken: string, email: string) => void | Promise<void>;
};

export function useRegisterForm({
  withDefaultLedger = false,
  inviteSrc,
  inviteBy,
  onSuccess,
  onSignedIn,
}: UseRegisterFormOptions) {
  const { t } = useTranslations();
  const formatError = useNewPasswordErrorMessage();
  const [serverError, setServerError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [defaultUsername] = useState(() => generateDefaultUsername());
  const [signUp] = useMutation<SignUpMutation, SignUpMutationVariables>(
    SignUpDocument,
  );

  const onSubmit = async (data: RegisterFormData) => {
    setServerError("");
    setIsLoading(true);
    try {
      const response = await signUp({
        variables: {
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          username: data.username,
          email: data.email,
          password: data.password,
          withDefaultLedger,
          inviteSrc,
          inviteBy,
        },
      });
      const responseData = response.data;
      if (responseData?.signUp.token) {
        // As in the code flow, sign_up counts a finished registration.
        track("sign_up", { method: "password" });
        await onSignedIn(responseData.signUp.token, data.email);
      } else if (responseData) {
        onSuccess(responseData.signUp.sessionId, data.email);
      } else {
        setServerError(t("auth.registrationFailed"));
      }
    } catch (err: unknown) {
      setServerError(formatError(err));
    } finally {
      setIsLoading(false);
    }
  };

  return { onSubmit, isLoading, serverError, defaultUsername };
}
