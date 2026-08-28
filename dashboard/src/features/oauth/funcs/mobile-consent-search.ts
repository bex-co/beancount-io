import { z } from "zod";

/**
 * Search params the authorization server puts on `/oauth/mobile-consent`.
 *
 * `screen_hint` is set when the app's Sign Up button started the flow. The
 * server already rejects any other value, so an unexpected one here can only
 * be hand-typed; treat it as absent rather than failing the page.
 */
export const mobileConsentSearchSchema = z.object({
  uid: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[A-Za-z0-9_-]+$/),
  scope: z.string().min(1).max(512),
  screen_hint: z.enum(["signup"]).optional().catch(undefined),
});

export type MobileConsentSearch = z.infer<typeof mobileConsentSearchSchema>;
