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
import { RegisterForm } from "@/features/auth/components/register-form";
import { OtpForm } from "@/features/auth/components/otp-form";

const routeApi = getRouteApi("/oauth/consent");

// "otp" variant requires sessionId + email; "register"/"login"/"ledger" are simple
type OAuthState =
  | { step: "login" | "register" | "ledger" }
  | { step: "otp"; sessionId: string; email: string };

function LoginStep({
  onSuccess,
  onRegisterClick,
}: {
  onSuccess: () => void;
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
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">
          {t("auth.oauthSignInToContinue")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("auth.oauthAppWantsAccess")}
        </p>
      </div>
      <LoginForm
        onSubmit={onSubmit}
        isLoading={isLoading}
        serverError={serverError}
        showForgotPasswordLink={false}
        showSignUpLink={true}
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
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">
          {t("auth.oauthRegisterToContinue")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("auth.oauthAppWantsAccess")}
        </p>
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

function LedgerStep({ uid }: { uid: string }) {
  const { t } = useTranslations();
  const [selected, setSelected] = useState<string | null>(null);
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
        <p className="text-sm text-muted-foreground">Loading ledgers…</p>
      ) : ledgers.length === 0 ? (
        <div className="space-y-3">
          <Alert>
            <AlertDescription>
              {t("auth.oauthNoLedgersMessage")}
            </AlertDescription>
          </Alert>
          <Link to="/auth/welcome">
            <Button variant="outline" className="w-full">
              Create a ledger
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
                onChange={() => setSelected(ledger.fullName)}
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
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {!loading && ledgers.length > 0 && (
        <form
          method="POST"
          action={`/oauth/consent?uid=${uid}`}
          onSubmit={(e) => {
            if (!selected) {
              e.preventDefault();
              setError("Please select a ledger.");
            }
          }}
        >
          <input type="hidden" name="ledgerId" value={selected ?? ""} />
          <Button type="submit" disabled={!selected} className="w-full">
            {t("auth.oauthApproveAccess")}
          </Button>
        </form>
      )}
    </div>
  );
}

export default function OAuthConsentPage() {
  const { uid } = routeApi.useSearch();
  const { initialStep } = routeApi.useLoaderData();
  const [state, setState] = useState<OAuthState>({ step: initialStep });

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6 rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold">Beancount</span>
        </div>
        {state.step === "login" && (
          <LoginStep
            onSuccess={() => setState({ step: "ledger" })}
            onRegisterClick={() => setState({ step: "register" })}
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
        {state.step === "ledger" && <LedgerStep uid={uid} />}
      </div>
    </div>
  );
}
