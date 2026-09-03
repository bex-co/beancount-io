import { createFileRoute } from "@tanstack/react-router";
import RegisterFlow from "@/features/auth/pages/register";
import { z } from "zod";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";
import { registerBeforeLoad } from "@/features/auth/pages/register/loader";

const signUpSearchSchema = z.object({
  withDefaultLedger: z.boolean().optional(),
  src: z.string().optional(),
  by: z.string().optional(),
  // Post-signup destination (e.g. the marketing /pricing page's paid-plan
  // CTAs pass ?next=%2Fpricing). Validated by getSafeRedirectPath before use.
  next: z.string().optional(),
});

export const Route = createFileRoute("/auth/sign-up")({
  component: RegisterFlow,
  beforeLoad: registerBeforeLoad,
  validateSearch: (search) => signUpSearchSchema.parse(search),
  head: () =>
    createHeadMeta(
      getSEOMetadata("seo.signUp.title", "seo.signUp.description"),
    ),
});
