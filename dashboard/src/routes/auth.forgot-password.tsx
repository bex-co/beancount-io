import { createFileRoute } from "@tanstack/react-router";
import ForgotPasswordPage from "@/features/auth/pages/forgot-password-page";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";

export const Route = createFileRoute("/auth/forgot-password")({
  component: ForgotPasswordPage,
  head: () =>
    createHeadMeta(
      getSEOMetadata(
        "seo.forgotPassword.title",
        "seo.forgotPassword.description",
      ),
    ),
});
