import { useApolloClient } from "@apollo/client/react";
import { useRegisterForm } from "@/features/auth/hooks/use-register-form";

type UseConsentRegisterFormOptions = {
  withDefaultLedger: boolean;
  onSuccess: (sessionId: string, email: string) => void;
  /** Sign-up arrived already signed in (a self-hosted deployment): no code step. */
  onSignedIn: (email: string) => void;
};

/**
 * The OAuth consent pages' sign-up form. Like their sign-in and code steps, a
 * finished sign-up resets the Apollo store before the page moves on, so the
 * next step reads as the new user.
 */
export function useConsentRegisterForm({
  withDefaultLedger,
  onSuccess,
  onSignedIn,
}: UseConsentRegisterFormOptions) {
  const client = useApolloClient();
  return useRegisterForm({
    withDefaultLedger,
    onSuccess,
    onSignedIn: async (_accessToken, email) => {
      await client.resetStore();
      onSignedIn(email);
    },
  });
}
