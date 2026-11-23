import { useEffect, useLayoutEffect, useRef } from "react";
import { useApolloClient } from "@apollo/client/react";
import { Alert, AlertDescription } from "@/common/components/ui/alert";
import { Button } from "@/common/components/ui/button";
import { useTranslations } from "@/common/hooks/use-translations";
import {
  clearDraftSignInRequirement,
  registerProtectedDraft,
  useDraftSignInRequired,
} from "@/common/lib/auth/draft-session";
import { fetchUserProfile } from "@/common/server-fn/user";

export function DraftSessionNotice() {
  useLayoutEffect(registerProtectedDraft, []);
  const signInRequired = useDraftSignInRequired();
  return signInRequired ? <SignInAgain /> : null;
}

function SignInAgain() {
  const { t } = useTranslations();
  const client = useApolloClient();
  const notice = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const returnFocus = document.activeElement;
    let mounted = true;
    const checkSession = () => {
      void fetchUserProfile(client).then((result) => {
        if (mounted && result.status === "signed-in") {
          if (
            notice.current?.contains(document.activeElement) &&
            returnFocus instanceof HTMLElement &&
            returnFocus.isConnected
          ) {
            returnFocus.focus({ preventScroll: true });
          }
          clearDraftSignInRequirement();
        }
      });
    };
    window.addEventListener("focus", checkSession);
    return () => {
      mounted = false;
      window.removeEventListener("focus", checkSession);
    };
  }, [client]);

  return (
    <Alert ref={notice} className="shrink-0">
      <AlertDescription className="gap-2">
        <p>{t("common.draftSessionSignedOut")}</p>
        <Button asChild size="sm" variant="outline">
          <a href="/auth/login" target="_blank" rel="noopener noreferrer">
            {t("auth.signIn")}
          </a>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
