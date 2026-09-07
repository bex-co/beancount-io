import { useState } from "react";
import { useQuery, useApolloClient } from "@apollo/client/react";
import { getRouteApi, Link } from "@tanstack/react-router";
import { ListLedgersDocument } from "@/graphql/definitions";
import { Button } from "@/common/components/ui/button";
import { Alert, AlertDescription } from "@/common/components/ui/alert";
import { useTranslations } from "@/common/hooks/use-translations";
import { useLoginForm } from "@/features/auth/hooks/use-login-form";
import { useRegisterForm } from "@/features/auth/hooks/use-register-form";
import { useOtpForm } from "@/features/auth/hooks/use-otp-form";
import { LoginForm } from "@/features/auth/components/login-form";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";
import { AuthPageLayout } from "@/features/auth/components/auth-page-layout";
import { RegisterForm } from "@/features/auth/components/register-form";
import { OtpForm } from "@/features/auth/components/otp-form";

import { describeMobileScopes } from "@/features/oauth/funcs/mobile-scope-copy";

const routeApi = getRouteApi("/oauth/consent");

// "otp" variant requires sessionId + email; "register"/"login"/"ledger" are simple
type OAuthState =
  | { step: "login" | "forgot_password" | "register" | "ledger" }
  | { step: "otp"; sessionId: string; email: string };

function LoginStep({
  onSuccess,
  onForgotPasswordClick,
  onRegisterClick,
}: {
  onSuccess: () => void;
  onForgotPasswordClick: () => void;
  onRegisterClick: () => void;
}) {
  const { t } = useTranslations();
  const client = useApolloClient();

  const { onSubmit, isLoading, serverError } = useLoginForm({
    onSuccess: async () => {
      await client.resetStore();
      onSuccess();
    },
  });

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">
          {t("auth.oauthSignInToContinue")}
        </h1>
        <p className="text-muted-foreground">{t("auth.oauthAppWantsAccess")}</p>
      </div>
      <LoginForm
        onSubmit={onSubmit}
        isLoading={isLoading}
        serverError={serverError}
        onForgotPasswordClick={onForgotPasswordClick}
        onRegisterClick={onRegisterClick}
      />
    </div>
  );
}

function RegisterStep({
  onSuccess,
  onSignInClick,
}: {
  onSuccess: (sessionId: string, email: string) => void;
  onSignInClick: () => void;
}) {
  const { t } = useTranslations();

  const { onSubmit, isLoading, serverError, defaultUsername } = useRegisterForm(
    { withDefaultLedger: true, onSuccess },
  );

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">
          {t("auth.oauthRegisterToContinue")}
        </h1>
        <p className="text-muted-foreground">{t("auth.oauthAppWantsAccess")}</p>
      </div>
      <RegisterForm
        onSubmit={onSubmit}
        isLoading={isLoading}
        serverError={serverError}
        defaultUsername={defaultUsername}
        showSignInLink={true}
        onSignInClick={onSignInClick}
      />
    </div>
  );
}

function OtpStep({
  sessionId,
  email,
  onSuccess,
  onBack,
}: {
  sessionId: string;
  email: string;
  onSuccess: () => void;
  onBack: () => void;
}) {
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

function LedgerStep({ uid, scope }: { uid: string; scope?: string }) {
  const { t } = useTranslations();
  const [selected, setSelected] = useState<string | null>(null);
  const [accountWide, setAccountWide] = useState(false);
  const [error, setError] = useState("");
  const { data, loading } = useQuery(ListLedgersDocument);

  const ledgers = data?.listLedgers ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{t("auth.oauthChooseLedger")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("auth.oauthSelectLedger")}
        </p>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">
          {t("page.dashboard.loadingLedgers")}
        </p>
      ) : ledgers.length === 0 ? (
        <div className="space-y-3">
          <Alert>
            <AlertDescription>
              {t("auth.oauthNoLedgersMessage")}
            </AlertDescription>
          </Alert>
          <Link
            to="/auth/welcome"
            search={{ oauthUid: uid, oauthScope: scope }}
          >
            <Button variant="outline" className="w-full">
              {t("page.dashboard.createLedger")}
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {ledgers.map((ledger) => (
            <label
              key={ledger.id}
              className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                selected === ledger.fullName
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <input
                type="radio"
                name="ledger"
                value={ledger.fullName}
                checked={selected === ledger.fullName}
                onChange={() => {
                  setSelected(ledger.fullName);
                  setAccountWide(false);
                }}
                className="sr-only"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{ledger.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {ledger.fullName}
                </p>
              </div>
            </label>
          ))}
        </div>
      )}
      {scope && (
        <>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {describeMobileScopes(scope, t).map((permission) => (
              <li key={permission}>{permission}</li>
            ))}
          </ul>
          <label className="flex items-start gap-3 rounded-md border p-3 cursor-pointer">
            <input
              type="radio"
              name="ledger"
              checked={accountWide}
              onChange={() => {
                setAccountWide(true);
                setSelected(null);
              }}
            />
            <span>
              <span className="block font-medium text-sm">
                {t("auth.oauthAllLedgers")}
              </span>
              <span className="block text-xs text-muted-foreground">
                {t("auth.oauthAllLedgersDescription")}
              </span>
            </span>
          </label>
        </>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {!loading && (ledgers.length > 0 || scope) && (
        <form
          method="POST"
          action={`/oauth/consent?${new URLSearchParams({ uid })}`}
          onSubmit={(e) => {
            if (!selected && !accountWide) {
              e.preventDefault();
              setError(t("auth.oauthLedgerRequired"));
            }
          }}
        >
          {accountWide ? (
            <input type="hidden" name="accountWide" value="true" />
          ) : (
            <input type="hidden" name="ledgerId" value={selected ?? ""} />
          )}
          {scope && <input type="hidden" name="scope" value={scope} />}
          <Button
            type="submit"
            disabled={!selected && !accountWide}
            className="w-full"
          >
            {t("auth.oauthApproveAccess")}
          </Button>
        </form>
      )}
      <form
        method="POST"
        action={`/oauth/consent?${new URLSearchParams({ uid })}`}
      >
        <Button
          type="submit"
          name="decision"
          value="cancel"
          variant="outline"
          className="w-full"
        >
          {t("common.cancel")}
        </Button>
      </form>
    </div>
  );
}

export default function OAuthConsentPage() {
  const { uid, scope } = routeApi.useSearch();
  const { initialStep } = routeApi.useLoaderData();
  const [state, setState] = useState<OAuthState>({ step: initialStep });

  if (state.step === "ledger") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm space-y-6 rounded-xl border bg-card p-6 shadow-sm">
          <div className="text-xl font-bold">Beancount</div>
          <LedgerStep uid={uid} scope={scope} />
        </div>
      </div>
    );
  }

  return (
    <AuthPageLayout>
      <div className="space-y-8">
        {state.step === "login" && (
          <LoginStep
            onSuccess={() => setState({ step: "ledger" })}
            onForgotPasswordClick={() => setState({ step: "forgot_password" })}
            onRegisterClick={() => setState({ step: "register" })}
          />
        )}
        {state.step === "forgot_password" && (
          <ForgotPasswordForm
            onBackToSignIn={() => setState({ step: "login" })}
          />
        )}
        {state.step === "register" && (
          <RegisterStep
            onSuccess={(sessionId, email) =>
              setState({ step: "otp", sessionId, email })
            }
            onSignInClick={() => setState({ step: "login" })}
          />
        )}
        {state.step === "otp" && (
          <OtpStep
            sessionId={state.sessionId}
            email={state.email}
            onSuccess={() => setState({ step: "ledger" })}
            onBack={() => setState({ step: "register" })}
          />
        )}
      </div>
    </AuthPageLayout>
  );
}
