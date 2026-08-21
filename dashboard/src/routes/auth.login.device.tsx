import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";
import DeviceAuthPage from "@/features/auth/pages/device-auth-page";
import { deviceAuthLoader } from "@/features/auth/pages/device-auth-page/loader";

const deviceAuthSearchSchema = z.object({
  session_id: z.string(),
});

export const Route = createFileRoute("/auth/login/device")({
  component: DeviceAuthPage,
  validateSearch: deviceAuthSearchSchema,
  loaderDeps: ({ search }) => ({ sessionId: search.session_id }),
  loader: deviceAuthLoader,
  beforeLoad: ({ context, search }) => {
    if (!context.userProfile) {
      throw redirect({
        to: "/auth/login",
        search: {
          next: `/auth/login/device?session_id=${search.session_id}`,
        },
      });
    }
  },
  head: () =>
    createHeadMeta(
      getSEOMetadata("seo.deviceAuth.title", "seo.deviceAuth.description"),
      { noIndex: true },
    ),
});
