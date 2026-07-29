import { createFileRoute } from "@tanstack/react-router";
import RegisterFlow from "@/features/auth/pages/register";
import { z } from "zod";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";
import { registerLoader } from "@/features/auth/pages/register/loader";

const signUpSearchSchema = z.object({
  withDefaultLedger: z.boolean().optional(),
});

export const Route = createFileRoute("/auth/sign-up")({
  component: RegisterFlow,
  loader: registerLoader,
  validateSearch: (search) => signUpSearchSchema.parse(search),
  head: () =>
    createHeadMeta(
      getSEOMetadata("seo.signUp.title", "seo.signUp.description"),
    ),
});
