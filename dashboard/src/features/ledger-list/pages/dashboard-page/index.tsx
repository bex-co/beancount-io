import { DashboardLayout } from "./components/dashboard-layout";
import { ActivityFeed } from "../../components/activity-feed";
import { WhatsNew } from "../../components/whats-new";
import { PageSEO } from "@/common/components/seo/page-seo";
import { useTranslations } from "@/common/hooks/use-translations";

/**
 * Dashboard page component
 *
 * Protected home, and deliberately only two sections: the releases we shipped
 * for this user, and the work this user did. The blog is written for search
 * visitors rather than signed-in customers — at roughly twenty posts a day and
 * none of them tagged `beancount`, no amount of collapsing makes it worth the
 * space here.
 */
export default function DashboardPage() {
  const { t } = useTranslations();
  return (
    <>
      <PageSEO
        titleKey="seo.dashboard.title"
        descriptionKey="seo.dashboard.description"
        noIndex
      />
      <DashboardLayout>
        <div className="flex-1 overflow-auto p-4 sm:p-6">
          <div className="mx-auto max-w-3xl space-y-8">
            <h1 className="sr-only">{t("page.dashboard.dashboard")}</h1>
            <WhatsNew />
            <ActivityFeed />
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}
