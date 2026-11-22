import { useParams } from "@tanstack/react-router";
import { useQuery } from "@apollo/client/react";
import {
  GetLedgerDocument,
  type GetLedgerQuery,
  type GetLedgerQueryVariables,
} from "@/graphql/definitions";
import { useTranslations } from "@/common/hooks/use-translations";
import { createLedgerId } from "@/common/lib/utils/encode";
import { LedgerPage, LedgerPageHeading } from "@/common/components/ledger-page";
import { RelatedLinks } from "@/common/components/related-links";
import { Authenticated } from "@/common/components/authenticated";
import { QueryView } from "@/common/components/query-view";
import { GeneralSettingsSection } from "./general-settings-section";
import { VisibilitySection } from "./visibility-section";
import { CollaboratorsSection } from "./collaborators-section";
import { BeancountOptionsSection } from "./beancount-options-section";
import { FavaOptionsSection } from "./fava-options-section";
import { DangerZoneSection } from "./danger-zone-section";
import { LedgerAdminPermission } from "@/common/components/ledger-permission/admin";
import { Card, CardContent, CardHeader } from "@/common/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/common/components/ui/tabs";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/common/components/ui/alert";
import { AlertTriangle } from "lucide-react";

function SettingsSkeleton() {
  return (
    <LedgerPage className="space-y-5 sm:space-y-6">
      <div className="h-8 w-48 bg-muted animate-pulse rounded" />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="h-6 w-32 bg-muted animate-pulse rounded" />
            <div className="h-4 w-64 bg-muted animate-pulse rounded" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="h-10 w-full bg-muted animate-pulse rounded" />
              <div className="h-10 w-24 bg-muted animate-pulse rounded" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="h-6 w-36 bg-muted animate-pulse rounded" />
            <div className="h-4 w-56 bg-muted animate-pulse rounded" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="h-10 w-full bg-muted animate-pulse rounded" />
              <div className="h-10 w-full bg-muted animate-pulse rounded" />
            </div>
          </CardContent>
        </Card>
      </div>
    </LedgerPage>
  );
}

export function LedgerSettingsContent({
  ledger,
  ledgerId,
}: {
  ledger: NonNullable<GetLedgerQuery["getLedger"]>;
  ledgerId: string;
}) {
  const { t } = useTranslations();
  const { ledgerOwner, ledgerName } = useParams({
    from: "/ledger/$ledgerOwner/$ledgerName/settings",
  });

  return (
    <LedgerPage className="space-y-5 sm:space-y-6">
      <LedgerPageHeading
        title={t("common.ledgerSettings")}
        description={t("common.pageDescription.settings", {
          ledgerName: ledger.name,
        })}
      />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 xl:items-start">
        <div className="space-y-6">
          <Authenticated>
            <GeneralSettingsSection ledger={ledger} ledgerId={ledgerId} />
          </Authenticated>
          <Authenticated>
            <VisibilitySection ledger={ledger} ledgerId={ledgerId} />
          </Authenticated>
          <LedgerAdminPermission>
            <CollaboratorsSection ledgerId={ledgerId} />
          </LedgerAdminPermission>
          <LedgerAdminPermission>
            <DangerZoneSection ledger={ledger} ledgerId={ledgerId} />
          </LedgerAdminPermission>
        </div>
        <div className="space-y-4">
          <Tabs defaultValue="beancount" className="w-full space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="beancount">
                {t("page.settings.beancountOptions")}
              </TabsTrigger>
              <TabsTrigger value="fava">
                {t("page.settings.favaOptions")}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="beancount" className="mt-0">
              <BeancountOptionsSection ledger={ledger} />
            </TabsContent>
            <TabsContent value="fava" className="mt-0">
              <FavaOptionsSection ledger={ledger} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <RelatedLinks
        links={[
          {
            label: t("common.relatedLinks.versionHistory"),
            to: `/ledger/${ledgerOwner}/${ledgerName}/commits`,
          },
          {
            label: t("common.relatedLinks.overview"),
            to: `/ledger/${ledgerOwner}/${ledgerName}`,
          },
        ]}
      />
    </LedgerPage>
  );
}

export default function LedgerSettingsPage() {
  const { ledgerOwner, ledgerName } = useParams({
    from: "/ledger/$ledgerOwner/$ledgerName/settings",
  });
  const ledgerId = createLedgerId(ledgerOwner, ledgerName);
  const { t } = useTranslations();

  const { data, loading, error, refetch } = useQuery<
    GetLedgerQuery,
    GetLedgerQueryVariables
  >(GetLedgerDocument, {
    variables: { ledgerId },
    skip: !ledgerId,
  });

  const ledger = data?.getLedger;

  return (
    <QueryView
      loading={loading}
      error={error}
      onRetry={refetch}
      data={ledger}
      loadingSlot={<SettingsSkeleton />}
      emptySlot={
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t("common.error")}</AlertTitle>
          <AlertDescription>
            {t("page.settings.failedToLoadLedgerSettings")}
          </AlertDescription>
        </Alert>
      }
    >
      {(l) => <LedgerSettingsContent ledger={l} ledgerId={ledgerId} />}
    </QueryView>
  );
}
