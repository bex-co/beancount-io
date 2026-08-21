import { useParams } from "@tanstack/react-router";
import { useQuery } from "@apollo/client/react";
import {
  GetLedgerDocument,
  type GetLedgerQuery,
  type GetLedgerQueryVariables,
} from "@/graphql/definitions";
import { useTranslations } from "@/common/hooks/use-translations";
import { createLedgerId } from "@/common/lib/utils/encode";
import { PageHeader } from "@/common/components/page-header";
import { RelatedLinks } from "@/common/components/related-links";
import { LedgerPageSEO } from "@/common/components/seo/ledger-page-seo";
import { Authenticated } from "@/common/components/authenticated";
import { QueryView } from "@/common/components/query-view";
import { GeneralSettingsSection } from "./general-settings-section";
import { VisibilitySection } from "./visibility-section";
import { CollaboratorsSection } from "./collaborators-section";
import { BeancountOptionsSection } from "./beancount-options-section";
import { FavaOptionsSection } from "./fava-options-section";
// import { BcioOptionsSection } from "./bcio-options-section";
import { DangerZoneSection } from "./danger-zone-section";
import { LedgerAdminPermission } from "@/common/components/ledger-permission/admin";
import { Card, CardContent, CardHeader } from "@/common/components/ui/card";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/common/components/ui/alert";
import { AlertTriangle } from "lucide-react";

function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 bg-muted animate-pulse rounded" />
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
    </div>
  );
}

function LedgerSettingsContent({
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
    <div className="space-y-6 max-w-4xl">
      <LedgerPageSEO seoKey="ledgerSettings" noIndex />
      <PageHeader
        title={t("common.ledgerSettings")}
        description={t("common.pageDescription.settings", {
          ledgerName: ledger.name,
        })}
      />
      <Authenticated>
        <GeneralSettingsSection ledger={ledger} ledgerId={ledgerId} />
      </Authenticated>
      <Authenticated>
        <VisibilitySection ledger={ledger} ledgerId={ledgerId} />
      </Authenticated>
      <Authenticated>
        <CollaboratorsSection ledgerId={ledgerId} />
      </Authenticated>
      <BeancountOptionsSection ledger={ledger} />
      <FavaOptionsSection ledger={ledger} />
      {/* <BcioOptionsSection ledger={ledger} /> */}
      <LedgerAdminPermission>
        <DangerZoneSection ledger={ledger} ledgerId={ledgerId} />
      </LedgerAdminPermission>
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
    </div>
  );
}

export default function LedgerSettingsPage() {
  const { ledgerOwner, ledgerName } = useParams({
    from: "/ledger/$ledgerOwner/$ledgerName/settings",
  });
  const ledgerId = createLedgerId(ledgerOwner, ledgerName);
  const { t } = useTranslations();

  const { data, loading, error } = useQuery<
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
