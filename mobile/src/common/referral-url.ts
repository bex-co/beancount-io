// Referrals belong to the hosted Beancount.io growth program rather than a
// server-owned mobile API. Keep this destination explicit: self-hosted auth,
// GraphQL, and REST traffic is resolved through `getEndpoint()` instead.
const SIGN_UP_URL = "https://beancount.io/auth/sign-up";

export function buildReferralUrl(source: string, referrerId: string): string {
  const url = new URL(SIGN_UP_URL);
  url.searchParams.set("src", source);
  url.searchParams.set("by", referrerId);
  return url.toString();
}
