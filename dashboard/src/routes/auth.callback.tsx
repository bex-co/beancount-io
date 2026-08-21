import { createFileRoute } from "@tanstack/react-router";
import AuthPage from "@/features/auth/pages/auth-callback-page";
import { z } from "zod";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";

const authSearchSchema = z.object({
  oneTimeToken: z.string().optional(),
  next: z.string().optional(),
});

export const Route = createFileRoute("/auth/callback")({
  component: AuthPage,
  validateSearch: authSearchSchema,
  head: () =>
    createHeadMeta(
      getSEOMetadata("seo.authCallback.title", "seo.authCallback.description"),
      { noIndex: true },
    ),
  ssr: false,
});
