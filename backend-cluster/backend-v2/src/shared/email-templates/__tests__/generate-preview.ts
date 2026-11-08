#!/usr/bin/env ts-node

import fs from "fs";
import path from "path";
import { EMAIL_THEME } from "../components/email-theme";
import {
  renderCheckoutRecoveryHtml,
  type CheckoutRecoveryEmailParams,
} from "../templates/checkout-recovery.template";
import { renderPasswordResetHtml } from "../templates/password-reset.template";
import {
  renderPlanChangeHtml,
  type PlanChangeEmailParams,
} from "../templates/plan-change.template";
import {
  renderRenewalHtml,
  type RenewalEmailParams,
} from "../templates/renewal.template";
import { renderSignupOtpHtml } from "../templates/signup-otp.template";
import { renderWelcomeHtml } from "../templates/welcome.template";
import { escapeHtml } from "../utils/url-validator";

export interface TemplatePreview {
  title: string;
  params: object;
  html: string;
}

export function buildTemplatePreviews(): TemplatePreview[] {
  const welcomeParams = {
    firstName: "Alice",
    dashboardUrl: "https://dashboard.beancount.io",
    mobileAppUrl: "https://beancount.io/mobile",
    helpCenterUrl: "https://beancount.io/docs",
  };
  const signupOtpParams = { otp: "123456" };
  const passwordResetParams = {
    resetLink:
      "https://dashboard.beancount.io/auth/reset-password/?token=public-preview-token",
    signInRecovery: {
      link: "https://dashboard.beancount.io/auth/login/?recovery=public-preview-challenge",
      code: "123456",
    },
  };
  const planChangeParams: PlanChangeEmailParams = {
    kind: "scheduled",
    currentPlan: "Growth · Yearly",
    newPlan: "Premium · Yearly",
    effectiveDate: "October 17, 2027",
    limitChanges: [
      { label: "Ledgers", from: "20", to: "5" },
      { label: "Collaborators per ledger", from: "10", to: "5" },
      {
        label: "AI Assistant tokens per month",
        from: "2,000,000",
        to: "500,000",
      },
    ],
    billingUrl: "https://beancount.io/settings/billing",
  };
  const renewal = {
    plan: "Premium · Yearly",
    billingUrl: "https://beancount.io/settings/billing",
  };
  const renewalFailedParams: RenewalEmailParams = {
    ...renewal,
    kind: "failed",
    amount: "$143.88",
    // What subscribers get: Stripe automations leave the retry time out.
    nextAttemptDate: null,
  };
  const renewalFinalParams: RenewalEmailParams = { ...renewal, kind: "final" };
  const renewalUpcomingParams: RenewalEmailParams = {
    ...renewal,
    kind: "upcoming",
    amount: "$143.88",
    renewalDate: "October 17, 2027",
  };

  const checkoutRecoveryParams: CheckoutRecoveryEmailParams = {
    tier: "Premium",
    plan: "Premium · Yearly",
    interval: "year",
    code: "K7QX2M9P",
    checkoutUrl: "https://checkout.stripe.com/r/live_example",
  };

  return [
    {
      title: "Welcome Email",
      params: welcomeParams,
      html: renderWelcomeHtml(welcomeParams),
    },
    {
      title: "Signup OTP Email",
      params: signupOtpParams,
      html: renderSignupOtpHtml(signupOtpParams),
    },
    {
      title: "Password Reset Email",
      params: passwordResetParams,
      html: renderPasswordResetHtml(passwordResetParams),
    },
    {
      title: "Plan Change Scheduled Email",
      params: planChangeParams,
      html: renderPlanChangeHtml(planChangeParams),
    },
    {
      title: "Plan Change Reminder Email",
      params: { ...planChangeParams, kind: "reminder" },
      html: renderPlanChangeHtml({ ...planChangeParams, kind: "reminder" }),
    },
    {
      title: "Renewal Failed Email",
      params: renewalFailedParams,
      html: renderRenewalHtml(renewalFailedParams),
    },
    {
      title: "Renewal Final Notice Email",
      params: renewalFinalParams,
      html: renderRenewalHtml(renewalFinalParams),
    },
    {
      title: "Yearly Renewal Reminder Email",
      params: renewalUpcomingParams,
      html: renderRenewalHtml(renewalUpcomingParams),
    },
    {
      title: "Checkout Recovery Email",
      params: checkoutRecoveryParams,
      html: renderCheckoutRecoveryHtml(checkoutRecoveryParams),
    },
  ];
}

function escapeHtmlAttribute(value: string): string {
  return escapeHtml(value.replace(/[ \t]+$/gm, ""));
}

function renderFrame(preview: TemplatePreview, width: "desktop" | "mobile") {
  const label = width === "desktop" ? "Desktop · 640px" : "Mobile · 375px";

  return `
    <div class="preview-column preview-column--${width}">
      <h3>${label}</h3>
      <iframe title="${preview.title} ${label}" srcdoc="${escapeHtmlAttribute(preview.html)}"></iframe>
    </div>
  `;
}

export function renderPreviewPage(
  previews: TemplatePreview[] = buildTemplatePreviews(),
): string {
  const { light, dark, fontFamily, radius } = EMAIL_THEME;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Beancount.io Email Templates Preview</title>
  <style>
    :root { color-scheme: light dark; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 40px 20px;
      color: ${light.foreground};
      background: ${light.canvas};
      font-family: ${fontFamily};
    }
    .container { max-width: 1480px; margin: 0 auto; }
    h1 { margin: 0; font-size: clamp(28px, 4vw, 42px); }
    .intro { margin: 10px 0 32px; color: ${light.mutedForeground}; }
    .nav {
      position: sticky;
      top: 12px;
      z-index: 1;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 24px;
      padding: 12px;
      background: ${light.card};
      border: 1px solid ${light.border};
      border-radius: ${radius};
    }
    .nav a {
      padding: 8px 12px;
      color: ${light.primaryForeground};
      background: ${light.primary};
      border-radius: 7px;
      font-weight: 700;
      text-decoration: none;
    }
    .template-section {
      margin-bottom: 28px;
      padding: 24px;
      background: ${light.card};
      border: 1px solid ${light.border};
      border-radius: ${radius};
    }
    .template-title { margin: 0 0 16px; font-size: 26px; }
    .template-params {
      margin: 0 0 20px;
      padding: 14px;
      overflow-wrap: anywhere;
      color: ${light.accentForeground};
      background: ${light.accent};
      border-radius: 8px;
      font: 12px/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      white-space: pre-wrap;
    }
    .preview-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 375px;
      gap: 24px;
      align-items: start;
    }
    .preview-column h3 { margin: 0 0 8px; color: ${light.mutedForeground}; font-size: 14px; }
    iframe {
      display: block;
      width: 100%;
      height: 760px;
      background: ${light.canvas};
      border: 1px solid ${light.border};
      border-radius: 8px;
    }
    @media (max-width: 900px) {
      body { padding: 24px 12px; }
      .template-section { padding: 16px; }
      .preview-grid { grid-template-columns: 1fr; }
      .preview-column--mobile { width: min(100%, 375px); }
    }
    @media (prefers-color-scheme: dark) {
      body { color: ${dark.foreground}; background: ${dark.canvas}; }
      .intro, .preview-column h3 { color: ${dark.mutedForeground}; }
      .nav, .template-section { background: ${dark.card}; border-color: ${dark.border}; }
      .nav a { color: ${dark.primaryForeground}; background: ${dark.primary}; }
      .template-params { color: ${dark.accentForeground}; background: ${dark.accent}; }
      iframe { background: ${dark.canvas}; border-color: ${dark.border}; }
    }
  </style>
</head>
<body>
  <main class="container">
    <h1>Beancount.io Email Templates</h1>
    <p class="intro">Desktop and narrow-width previews. Toggle the browser's preferred color scheme to inspect supported dark mode.</p>
    <nav class="nav" aria-label="Template navigation">
      ${previews.map((preview, index) => `<a href="#template-${index}">${preview.title}</a>`).join("\n      ")}
    </nav>
    ${previews
      .map(
        (preview, index) => `
    <section class="template-section" id="template-${index}">
      <h2 class="template-title">${preview.title}</h2>
      <pre class="template-params">${JSON.stringify(preview.params, null, 2)}</pre>
      <div class="preview-grid">
        ${renderFrame(preview, "desktop")}
        ${renderFrame(preview, "mobile")}
      </div>
    </section>`,
      )
      .join("\n")}
    <p class="intro">Generated deterministically from public fixture values.</p>
  </main>
</body>
</html>
  `
    .replace(/[ \t]+$/gm, "")
    .trim();
}

function writePreview(): string {
  const outputPath = path.join(__dirname, "all-templates.html");
  fs.writeFileSync(outputPath, renderPreviewPage());
  return outputPath;
}

if (require.main === module) {
  const outputPath = writePreview();
  console.log(`Preview generated at ${outputPath}`);
}
