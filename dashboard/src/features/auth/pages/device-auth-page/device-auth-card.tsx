import type { ReactNode } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/common/components/ui/card";
import { Alert, AlertDescription } from "@/common/components/ui/alert";
import { PageSEO } from "@/common/components/seo/page-seo";
import { useTranslations } from "@/common/hooks/use-translations";

interface DeviceAuthCardProps {
  loading?: boolean;
  error?: string;
  children?: ReactNode;
}

export function DeviceAuthCard({
  loading,
  error,
  children,
}: DeviceAuthCardProps) {
  const { t } = useTranslations();

  return (
    <>
      <PageSEO
        titleKey="seo.deviceAuth.title"
        descriptionKey="seo.deviceAuth.description"
        noIndex
      />
      <main className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          {(loading || error) && (
            <h1 className="sr-only">{t("auth.cliAuthCodeEntryTitle")}</h1>
          )}
          {loading && (
            <CardContent className="pt-8 pb-8 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </CardContent>
          )}
          {error && (
            <CardContent className="pt-8 pb-8 space-y-4">
              <div className="flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                  <ShieldAlert className="w-8 h-8 text-destructive" />
                </div>
              </div>
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </CardContent>
          )}
          {children}
        </Card>
      </main>
    </>
  );
}
