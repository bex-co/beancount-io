#!/usr/bin/env ts-node

/**
 * Script to generate preview HTML for all email templates
 * Usage: npx ts-node src/email-templates/__tests__/generate-preview.ts
 */

import fs from "fs";
import { renderWelcomeHtml } from "../templates/welcome.template";
import { renderPasswordResetHtml } from "../templates/password-reset.template";

interface TemplatePreview {
  title: string;
  params: Record<string, unknown>;
  html: string;
}

function generatePreviews() {
  const previews: TemplatePreview[] = [];

  // 1. Welcome Email
  const welcomeParams = {
    firstName: "Alice",
    dashboardUrl: "https://beancount.io/ledger",
    mobileAppUrl: "http://onelink.to/v3rz2v",
    helpCenterUrl: "https://beancount.io/docs/help-center",
  };
  const welcomeHtml = renderWelcomeHtml(welcomeParams);
  const welcomeHtmlWide = welcomeHtml.replace(
    "max-width: 600px",
    "max-width: 100%",
  );
  previews.push({
    title: "Welcome Email",
    params: welcomeParams,
    html: welcomeHtmlWide,
  });

  // 2. Password Reset Email
  const passwordResetParams = {
    resetLink:
      "https://beancount.io/reset-password/?token=abc123def456ghi789jkl012mno345",
  };
  const passwordResetHtml = renderPasswordResetHtml(passwordResetParams);
  const passwordResetHtmlWide = passwordResetHtml.replace(
    "max-width: 600px",
    "max-width: 100%",
  );
  previews.push({
    title: "Password Reset Email",
    params: passwordResetParams,
    html: passwordResetHtmlWide,
  });

  // Generate combined HTML page
  const combinedHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Beancount.io Email Templates Preview</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
      padding: 40px 20px;
      margin: 0;
    }
    .container {
      max-width: 1600px;
      margin: 0 auto;
    }
    h1 {
      color: white;
      text-align: center;
      margin-bottom: 40px;
      font-size: 2.5em;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
    }
    .template-section {
      background: white;
      border-radius: 12px;
      padding: 30px;
      margin-bottom: 40px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    }
    .template-title {
      color: #2563eb;
      font-size: 1.8em;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 3px solid #2563eb;
    }
    .template-content {
      display: grid;
      grid-template-columns: 300px 1fr;
      gap: 30px;
      align-items: start;
    }
    .template-params {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 20px;
      position: sticky;
      top: 200px;
    }
    .template-params h3 {
      margin: 0 0 15px 0;
      color: #2563eb;
      font-size: 1.1em;
    }
    .template-params pre {
      margin: 0;
      background: #2d3748;
      color: #e2e8f0;
      padding: 12px;
      border-radius: 6px;
      font-size: 11px;
      line-height: 1.4;
      overflow-x: auto;
      font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
      word-wrap: break-word;
    }
    .template-preview {
      background: #f5f5f5;
      border-radius: 8px;
      padding: 0;
      overflow: hidden;
      min-height: 600px;
    }
    .template-preview iframe {
      width: 100%;
      min-height: 600px;
      border: none;
      display: block;
    }
    @media (max-width: 1024px) {
      .template-content {
        grid-template-columns: 1fr;
      }
      .template-params {
        position: static;
      }
    }
    .nav {
      background: white;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 40px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      position: sticky;
      top: 20px;
      z-index: 100;
    }
    .nav h2 {
      margin: 0 0 15px 0;
      color: #2563eb;
      font-size: 1.3em;
    }
    .nav a {
      display: inline-block;
      margin: 5px 10px 5px 0;
      padding: 8px 16px;
      background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 500;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .nav a:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
    }
    .generated-date {
      text-align: center;
      color: white;
      margin-top: 40px;
      font-size: 0.9em;
      opacity: 0.9;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Beancount.io Email Templates</h1>

    <div class="nav">
      <h2>Quick Navigation</h2>
      ${previews.map((preview, index) => `<a href="#template-${index}">${preview.title}</a>`).join("")}
    </div>

    ${previews
      .map(
        (preview, index) => `
      <div class="template-section" id="template-${index}">
        <h2 class="template-title">${preview.title}</h2>
        <div class="template-content">
          <div class="template-params">
            <h3>Template Data</h3>
            <pre>${JSON.stringify(preview.params, null, 2)}</pre>
          </div>
          <div class="template-preview">
            <iframe srcdoc="${preview.html.replace(/"/g, "&quot;").replace(/\n/g, " ")}" onload="this.style.height = this.contentWindow.document.body.scrollHeight + 'px'"></iframe>
          </div>
        </div>
      </div>
    `,
      )
      .join("")}

    <div class="generated-date">
      Generated on ${new Date().toLocaleString()}
    </div>
  </div>
</body>
</html>
  `.trim();

  // Write to file
  const outputPath =
    "/Users/tianpan/projects/web-beancount/backend-cluster/backend-v2/src/shared/email-templates/__tests__/all-templates.html";
  fs.writeFileSync(outputPath, combinedHtml);
  console.log(`Preview generated successfully at: ${outputPath}`);
  console.log(`Total templates: ${previews.length}`);
  console.log(`File size: ${(combinedHtml.length / 1024).toFixed(2)} KB`);
}

// Run the generator
generatePreviews();
