import { useMutation, useQuery } from "@apollo/client/react";
import { useSearch } from "@tanstack/react-router";
import { KeyRound } from "lucide-react";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Alert, AlertDescription } from "@/common/components/ui/alert";
import { Button } from "@/common/components/ui/button";
import { useTranslations } from "@/common/hooks/use-translations";
import { getErrorMessageKey } from "@/common/lib/errors/error-message";
import { useDeploymentInfo } from "@/common/hooks/use-deployment-info";
import { oidcErrorKey } from "@/features/auth/lib/oidc-error";
import {
  CreateOidcLinkUrlDocument,
  OidcLinkedDocument,
  UnlinkOidcDocument,
} from "@/graphql/definitions";

/** Link or unlink the operator's sign-in provider (shown only when set up). */
export function OidcSection() {
  const { oidcProviderName } = useDeploymentInfo();
  if (!oidcProviderName) return null;
  return <OidcCard name={oidcProviderName} />;
}

function OidcCard({ name }: { name: string }) {
  const { t } = useTranslations();
  const { oidcError } = useSearch({ from: "/settings/general" });
  const { data, refetch } = useQuery(OidcLinkedDocument, { ssr: false });
  const [createLinkUrl, link] = useMutation(CreateOidcLinkUrlDocument);
  const [unlinkOidc, unlink] = useMutation(UnlinkOidcDocument);
  // The backend's error from the last link attempt, until the next click.
  const [error, setError] = useState<string | undefined>(
    oidcError && oidcErrorKey(oidcError),
  );
  const linked = data?.oidcLinked;

  const onLink = async () => {
    setError(undefined);
    try {
      const result = await createLinkUrl({
        variables: { next: "/settings/general" },
      });
      if (result.data) window.location.assign(result.data.createOidcLinkUrl);
    } catch (e) {
      setError(getErrorMessageKey(e));
    }
  };

  const onUnlink = async () => {
    setError(undefined);
    try {
      await unlinkOidc();
      await refetch();
    } catch (e) {
      // The backend refuses when the account has no password to fall back on.
      setError(
        getErrorMessageKey(e) === "common.errors.forbidden"
          ? "auth.oidcUnlinkNeedsPassword"
          : getErrorMessageKey(e),
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5" />
          <h2>{t("auth.signInWith", { name })}</h2>
        </CardTitle>
        <CardDescription>
          {t(linked ? "auth.oidcLinked" : "auth.oidcNotLinked", { name })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{t(error)}</AlertDescription>
          </Alert>
        )}
        {linked !== undefined &&
          (linked ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onUnlink}
              loading={unlink.loading}
            >
              {t("auth.oidcUnlink")}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={onLink}
              loading={link.loading}
            >
              {t("auth.oidcLink")}
            </Button>
          ))}
      </CardContent>
    </Card>
  );
}
