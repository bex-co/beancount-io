const SIGN_UP_URL = "https://beancount.io/auth/sign-up";

export function buildReferralUrl(source: string, referrerId: string): string {
  const url = new URL(SIGN_UP_URL);
  url.searchParams.set("src", source);
  url.searchParams.set("by", referrerId);
  return url.toString();
}
