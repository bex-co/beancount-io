import { useApolloClient } from "@apollo/client/react";
import type en from "@/i18n/locales/en";
import { useTranslations } from "@/common/hooks/use-translations";
import { useDeploymentInfo } from "@/features/auth/hooks/use-deployment-info";
import { useLoginForm } from "@/features/auth/hooks/use-login-form";
import { useConsentRegisterForm } from "@/features/oauth/hooks/use-consent-register-form";
import { useOtpForm } from "@/features/auth/hooks/use-otp-form";
import { LoginForm } from "@/features/auth/components/login-form";
import { RegisterForm } from "@/features/auth/components/register-form";
import { OtpForm } from "@/features/auth/components/otp-form";

type TranslationKey = keyof typeof en;

type ConsentLoginStepProps = {
  onSuccess: () => void;
  onForgotPasswordClick: () => void;
  onRegisterClick: () => void;
  titleKey: TranslationKey;
  descriptionKey?: TranslationKey;
};

type ConsentRegisterStepProps = {
  onSuccess: (sessionId: string, email: string) => void;
  /** A self-hosted deployment verifies no email: sign-up arrives signed in. */
  onSignedIn: (email: string) => void;
  onSignInClick: () => void;
  withDefaultLedger: boolean;
  titleKey: TranslationKey;
  descriptionKey?: TranslationKey;
  hideUsername?: boolean;
  showLegalLinks?: boolean;
};

type ConsentOtpStepProps = {
  sessionId: string;
  email: string;
  onSuccess: () => void;
  onBack: () => void;
};

/**
 * The sign-in step shared by the OAuth consent pages (`consent`,
 * `identity-consent`, `mobile-consent`). Each page renders its own title and
 * supporting copy; the form wiring is identical: a finished sign-in resets the
 * Apollo store before the page moves on, so the next step reads as the new
 * user.
 */
export function ConsentLoginStep({
  onSuccess,
  onForgotPasswordClick,
  onRegisterClick,
  titleKey,
  descriptionKey,
}: ConsentLoginStepProps) {
  const { t } = useTranslations();
  const client = useApolloClient();
  // Read here, not passed in, so every consent page (MCP, mobile, identity)
  // drops "Sign Up" on a self-hosted stack that has closed sign-up.
  const { signUpOpen } = useDeploymentInfo();

  const { onSubmit, isLoading, serverError } = useLoginForm({
    onSuccess: async () => {
      await client.resetStore();
      onSuccess();
    },
  });

  return (
    <div className="space-y-8">
      {descriptionKey ? (
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">{t(titleKey)}</h1>
          <p className="text-muted-foreground">{t(descriptionKey)}</p>
        </div>
      ) : (
        <h1 className="text-3xl font-bold text-foreground">{t(titleKey)}</h1>
      )}
      <LoginForm
        onSubmit={onSubmit}
        isLoading={isLoading}
        serverError={serverError}
        onForgotPasswordClick={onForgotPasswordClick}
        onRegisterClick={onRegisterClick}
        showSignUpLink={signUpOpen}
      />
    </div>
  );
}

/** The sign-up step shared by the OAuth consent pages. */
export function ConsentRegisterStep({
  onSuccess,
  onSignedIn,
  onSignInClick,
  withDefaultLedger,
  titleKey,
  descriptionKey,
  hideUsername,
  showLegalLinks,
}: ConsentRegisterStepProps) {
  const { t } = useTranslations();

  const { onSubmit, isLoading, serverError, defaultUsername } =
    useConsentRegisterForm({ withDefaultLedger, onSuccess, onSignedIn });

  return (
    <div className="space-y-8">
      {descriptionKey ? (
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">{t(titleKey)}</h1>
          <p className="text-muted-foreground">{t(descriptionKey)}</p>
        </div>
      ) : (
        <h1 className="text-3xl font-bold text-foreground">{t(titleKey)}</h1>
      )}
      <RegisterForm
        onSubmit={onSubmit}
        isLoading={isLoading}
        serverError={serverError}
        defaultUsername={defaultUsername}
        hideUsername={hideUsername}
        showSignInLink={true}
        onSignInClick={onSignInClick}
        showLegalLinks={showLegalLinks}
      />
    </div>
  );
}

/** The email-code step shared by the OAuth consent pages. */
export function ConsentOtpStep({
  sessionId,
  email,
  onSuccess,
  onBack,
}: ConsentOtpStepProps) {
  const { t } = useTranslations();
  const client = useApolloClient();

  const { onSubmit, isLoading, serverError } = useOtpForm({
    sessionId,
    onSuccess: async () => {
      await client.resetStore();
      onSuccess();
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">
          {t("auth.oauthVerifyEmailToContinue")}
        </h2>
      </div>
      <OtpForm
        email={email}
        onSubmit={onSubmit}
        isLoading={isLoading}
        serverError={serverError}
        onBack={onBack}
      />
    </div>
  );
}
