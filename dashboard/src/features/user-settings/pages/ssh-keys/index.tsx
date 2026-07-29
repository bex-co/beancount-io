import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Key, Plus, AlertCircle, Loader2 } from "lucide-react";
import { useQuery } from "@apollo/client/react";
import { ListPublicKeysDocument } from "@/graphql/definitions";
import { KeyCreateDialog } from "./key-create-dialog";
import { KeyCard } from "./key-card";
import { useTranslations } from "@/common/hooks/use-translations";
import { PageSEO } from "@/common/components/seo/page-seo";

/**
 * Loading state component
 */
function SshKeysSkeleton() {
  const { t } = useTranslations();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-start">
        <Button disabled>
          <Plus className="h-4 w-4 mr-2" />
          {t("userSettings.newSshKey")}
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            {t("userSettings.sshKeys")}
          </CardTitle>
          <CardDescription>{t("userSettings.loadingSshKeys")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">
                {t("userSettings.loadingSshKeys")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Error state component
 */
function SshKeysError() {
  const { t } = useTranslations();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-start">
        <KeyCreateDialog>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {t("userSettings.newSshKey")}
          </Button>
        </KeyCreateDialog>
      </div>
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="flex items-center gap-3 py-6">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <div>
            <h3 className="font-medium text-destructive">
              {t("userSettings.failedToLoadKeys")}
            </h3>
            <p className="text-sm text-destructive/70">
              {t("userSettings.failedToLoadKeysDescription")}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Keys settings page component
 * Manages SSH keys for secure repository access
 */
export default function KeysSettingsPage() {
  const { t } = useTranslations();
  const {
    data,
    loading: isLoading,
    error,
  } = useQuery(ListPublicKeysDocument, {
    fetchPolicy: "cache-and-network", // Fetch fresh data but show stale while fetching
    ssr: false, // Don't run during SSR (user-specific data)
  });
  const keys = data?.listPublicKeys || [];

  if (isLoading) {
    return (
      <>
        <PageSEO
          titleKey="seo.settingsSshKeys.title"
          descriptionKey="seo.settingsSshKeys.description"
        />
        <SshKeysSkeleton />
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageSEO
          titleKey="seo.settingsSshKeys.title"
          descriptionKey="seo.settingsSshKeys.description"
        />
        <SshKeysError />
      </>
    );
  }

  return (
    <>
      <PageSEO
        titleKey="seo.settingsSshKeys.title"
        descriptionKey="seo.settingsSshKeys.description"
      />
      <div className="space-y-6">
        <div className="flex items-center justify-start ">
          <KeyCreateDialog>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t("userSettings.newSshKey")}
            </Button>
          </KeyCreateDialog>
        </div>

        {keys.length > 0 ? (
          <div className="space-y-4">
            {keys.map((keyData) => (
              <KeyCard key={keyData.id} keyData={keyData} />
            ))}
          </div>
        ) : (
          <Card className="border-dashed border-2 border-muted-foreground/25 bg-muted/20">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="p-4 bg-muted/50 rounded-full mb-4">
                <Key className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-medium text-foreground mb-2">
                {t("userSettings.noSshKeys")}
              </h3>
              <p className="text-muted-foreground text-center mb-6 max-w-md">
                {t("userSettings.noSshKeysDescription")}
              </p>
              <KeyCreateDialog>
                <Button variant="outline" size="lg">
                  <Plus className="h-4 w-4 mr-2" />
                  {t("userSettings.createNewKey")}
                </Button>
              </KeyCreateDialog>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
