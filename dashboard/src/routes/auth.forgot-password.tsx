import { createFileRoute } from "@tanstack/react-router";
import ForgotPasswordPage from "@/features/auth/pages/forgot-password-page";
import { z } from "zod";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";

const forgotPasswordSearchSchema = z.object({
  // Post-login destination carried through a cancelled recovery detour.
  // Validated by getSafeRedirectPath before use on login.
  next: z.string().optional(),
});

export const Route = createFileRoute("/auth/forgot-password")({
  component: ForgotPasswordPage,
  validateSearch: (search) => forgotPasswordSearchSchema.parse(search),
  head: ({ match }) =>
    createHeadMeta(
      match.context.localization.i18n,
      getSEOMetadata(
        match.context.localization.i18n,
        "seo.forgotPassword.title",
        "seo.forgotPassword.description",
      ),
    ),
});
