import { DangerZoneSection } from "../general/danger-zone-section";
import { PageSEO } from "@/common/components/seo/page-seo";

/**
 * Danger Zone settings page component
 * Manage destructive account actions like account deletion
 */
export default function DangerZoneSettingsPage() {
  return (
    <>
      <PageSEO
        titleKey="seo.settingsDangerZone.title"
        descriptionKey="seo.settingsDangerZone.description"
      />
      <div className="space-y-4">
        <DangerZoneSection />
      </div>
    </>
  );
}
