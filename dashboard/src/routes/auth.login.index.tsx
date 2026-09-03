import { createFileRoute } from "@tanstack/react-router";
import LoginPage from "@/features/auth/pages/login-page";
import { z } from "zod";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";
import { loginBeforeLoad } from "@/features/auth/pages/login-page/loader";

const loginSearchSchema = z.object({
  next: z.string().optional(),
  reason: z.enum(["expired"]).optional(),
});

export const Route = createFileRoute("/auth/login/")({
  component: LoginPage,
  beforeLoad: loginBeforeLoad,
  validateSearch: (search) => loginSearchSchema.parse(search),
  head: () =>
    createHeadMeta(getSEOMetadata("seo.login.title", "seo.login.description")),
  // ssr: false,
});
