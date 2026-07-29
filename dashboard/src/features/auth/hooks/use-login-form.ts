import { useState } from "react";
import { useMutation } from "@apollo/client/react";
import { SignInDocument } from "@/graphql/definitions";
import { useTranslations } from "@/common/hooks/use-translations";
import { useErrorMessage } from "@/common/lib/errors/error-message";
import { isUnauthenticatedError } from "@/common/apollo/links/auth-error-link";
import { track } from "@/common/analytics";
import type { Token } from "@/common/types/token";

type UseLoginFormOptions = {
  onSuccess: (token: Token) => void | Promise<void>;
};

export function useLoginForm({ onSuccess }: UseLoginFormOptions) {
  const { t } = useTranslations();
  const formatError = useErrorMessage();
  const [serverError, setServerError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [signIn] = useMutation(SignInDocument);

  const onSubmit = async (data: { email: string; password: string }) => {
    setServerError("");
    setIsLoading(true);
    try {
      const result = await signIn({
        variables: { email: data.email, password: data.password },
      });
      if (result.data) {
        track("login", { method: "password" });
        const token: Token = {
          accessToken: result.data.signIn.token,
          expiresAt: result.data.signIn.expireAt,
        };
        await onSuccess(token);
      } else {
        setServerError(t("auth.loginFailed"));
      }
    } catch (err: unknown) {
      // UNAUTHENTICATED here means rejected credentials, not an expired
      // session — show the login-specific message instead of the generic
      // "please sign in" mapping.
      setServerError(
        isUnauthenticatedError(err) ? t("auth.loginFailed") : formatError(err),
      );
    } finally {
      setIsLoading(false);
    }
  };

  return { onSubmit, isLoading, serverError };
}
