import { buildTemplatePreviews, renderPreviewPage } from "./generate-preview";

describe("Email template preview", () => {
  it("includes every customer template with public fixtures", () => {
    const previews = buildTemplatePreviews();
    expect(previews.map(({ title }) => title)).toEqual([
      "Welcome Email",
      "Signup OTP Email",
      "Password Reset Email",
    ]);
    expect(previews.every(({ html }) => html.includes("<!DOCTYPE html>"))).toBe(
      true,
    );
    expect(JSON.stringify(previews)).not.toContain("generated-date");
  });

  it("renders desktop and mobile frames plus dark-mode review guidance", () => {
    const html = renderPreviewPage();
    expect(html.match(/Desktop · 640px/g)).toHaveLength(6);
    expect(html.match(/Mobile · 375px/g)).toHaveLength(6);
    expect(html).toContain("@media (prefers-color-scheme: dark)");
    expect(html).toContain(
      "Generated deterministically from public fixture values",
    );
  });

  it("is deterministic", () => {
    expect(renderPreviewPage()).toBe(renderPreviewPage());
  });
});
