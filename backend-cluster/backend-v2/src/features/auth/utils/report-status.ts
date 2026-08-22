/**
 * Report subscription status enum.
 *
 * Report subscription functionality has been removed, but this enum is kept
 * because it is still part of the live account/user-profile surface:
 * `UserProfileResponse.emailReportStatus` (always `OFF`) exposes it for API
 * backward compatibility. Registered with TypeGraphQL in the resolver registry.
 */
export enum ReportStatus {
  "OFF" = "OFF",
  "WEEKLY" = "WEEKLY",
  "MONTHLY" = "MONTHLY",
}
