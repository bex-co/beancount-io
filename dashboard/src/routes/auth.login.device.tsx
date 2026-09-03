import { createFileRoute, redirect } from "@tanstack/react-router";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";
import DeviceAuthPage from "@/features/auth/pages/device-auth-page";

export const Route = createFileRoute("/auth/login/device")({
  component: DeviceAuthPage,
  // Deliberately no search params: the page identifies a CLI request only by a
  // code the person reads off their own terminal, so a link to this route
  // carries nothing an attacker could get someone to approve.
  beforeLoad: ({ context }) => {
    if (!context.userProfile) {
      throw redirect({
        to: "/auth/login",
        search: { next: "/auth/login/device" },
      });
    }
  },
  head: () =>
    createHeadMeta(
      getSEOMetadata("seo.deviceAuth.title", "seo.deviceAuth.description"),
      { noIndex: true },
    ),
});
