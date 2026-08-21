import { useNavigate, useSearch } from "@tanstack/react-router";
import { useMutation, useApolloClient } from "@apollo/client/react";
import {
  SignInWithOneTimeTokenDocument,
  ListLedgersDocument,
} from "@/graphql/definitions";
import { Navigate } from "@tanstack/react-router";
import { useTranslations } from "@/common/hooks/use-translations";
import { decodeLedgerId } from "@/common/lib/utils/encode";
import { useOnMounted } from "@/common/hooks/use-on-mounted";
import { Token } from "@/common/types/token";
import { PageSEO } from "@/common/components/seo/page-seo";
import { useIsAuthenticated } from "@/common/hooks/use-is-authenticated";

interface AuthWithOneTimeTokenProps {
  oneTimeToken: string;
  redirectTo?: string;
}

const AuthWithOneTimeToken = ({
  oneTimeToken,
  redirectTo,
}: AuthWithOneTimeTokenProps) => {
  const { t } = useTranslations();
  const navigate = useNavigate();
  const client = useApolloClient();
  const isAuthenticated = useIsAuthenticated();
  const [signInWithOneTimeToken] = useMutation(SignInWithOneTimeTokenDocument);

  useOnMounted(async () => {
    try {
      if (!isAuthenticated) {
        const response = await signInWithOneTimeToken({
          variables: { token: oneTimeToken },
        });

        if (!response.data) {
          await navigate({ to: "/auth/login" });
          return;
        }

        const token = {
          accessToken: response.data.signInWithOneTimeToken.token,
          expiresAt: response.data.signInWithOneTimeToken.expireAt,
        } as Token;

        // Send token to mobile webview (if present)
        if (typeof window !== "undefined") {
          window.postMessage(
            JSON.stringify({ authToken: token.accessToken }),
            "*",
          );
        }
      }

      if (redirectTo) {
        await navigate({ to: redirectTo });
        return;
      }

      // Query ledgers using client directly
      const ledgersResult = await client.query({
        query: ListLedgersDocument,
      });

      const ledgers = ledgersResult.data?.listLedgers || [];

      // If user has ledgers, redirect to first ledger's files tree
      if (ledgers.length > 0) {
        const firstLedgerId = ledgers[0]?.id;
        if (firstLedgerId) {
          const { ledgerOwner, ledgerName } = decodeLedgerId(firstLedgerId);
          await navigate({
            to: `/ledger/${ledgerOwner}/${ledgerName}/files/content`,
          });
          return;
        }
      }

      // Fallback to welcome page if no ledgers
      await navigate({ to: "/auth/welcome" });
    } catch {
      await navigate({ to: "/auth/login" });
    }
  });

  return (
    <>
      <PageSEO
        titleKey="seo.authCallback.title"
        descriptionKey="seo.authCallback.description"
        noIndex
      />
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md">
          <div className="pt-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">
                {t("auth.authenticating")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

/**
 * Auth page component
 * Handles one-time token authentication and redirects accordingly
 */
const AuthPage = () => {
  const search = useSearch({ from: "/auth/callback" });
  if (!search.oneTimeToken) {
    return <Navigate to="/auth/login" />;
  }
  // const token = getToken();
  // if (token) {
  //   return <Redirect to={search.next || "/auth/welcome"} />;
  // }
  return (
    <AuthWithOneTimeToken
      oneTimeToken={search.oneTimeToken}
      redirectTo={search.next}
    />
  );
};

export default AuthPage;
