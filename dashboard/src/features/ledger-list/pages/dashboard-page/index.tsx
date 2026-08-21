import { DashboardLayout } from "./components/dashboard-layout";
import { BlogFeed } from "../../components/blog-feed";
import { PageSEO } from "@/common/components/seo/page-seo";

/**
 * Dashboard page component
 * Protected page that shows sidebar navigation and the latest activity feed
 */
export default function DashboardPage() {
  return (
    <>
      <PageSEO
        titleKey="seo.dashboard.title"
        descriptionKey="seo.dashboard.description"
        noIndex
      />
      <DashboardLayout>
        <div className="flex-1 overflow-auto p-4 sm:p-6">
          <div className="mx-auto max-w-5xl">
            <BlogFeed />
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}
