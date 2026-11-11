import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { textContrast } from "@/test/contrast";
import { Alert, AlertDescription } from "../alert";

/**
 * The destructive alert's description carried `text-destructive/90`, which
 * put every load error, filter error and destructive warning at 4.3:1 on
 * the dark card — below WCAG 1.4.3's 4.5:1 for body text (w2/107). This
 * measures the variant's own classes against both themes' tokens.
 */
describe("destructive alert contrast", () => {
  it.each([":root", ".dark"] as const)(
    "keeps the description at 4.5:1 or more on the alert (%s)",
    async (theme) => {
      render(
        <Alert variant="destructive">
          <AlertDescription>Error loading journal entries</AlertDescription>
        </Alert>,
      );
      const classes = screen.getByRole("alert").className.split(/\s+/);
      const description = classes.find((name) =>
        name.includes("data-[slot=alert-description]:text-"),
      );
      expect(description).toBeDefined();
      expect(classes).toContain("bg-card");

      expect(
        await textContrast(description!, classes, theme),
      ).toBeGreaterThanOrEqual(4.5);
    },
  );
});
