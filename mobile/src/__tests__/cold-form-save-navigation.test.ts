import fs from "fs";
import path from "path";

/**
 * Static guardrail (w1/032): the three live entry forms must navigate
 * post-save with a fallback instead of a bare `router.back()`. A form opened
 * as the root route by a cold deep link has no back stack, so a bare back
 * raises an unhandled GO_BACK and strands the user on a live form after a
 * committed write. Each form falls back to its owning screen, and a
 * committed save disables the submit control so a stranded form cannot
 * double-submit.
 */

const FORMS = [
  {
    file: "screens/multi-postings-transaction/multi-postings-transaction-screen.tsx",
    fallback: 'router.replace("/(app)/(tabs)/transactions")',
    guard: "canSave",
  },
  {
    file: "screens/add-budget-screen/add-budget-screen.tsx",
    fallback: 'router.replace("/(app)/budget")',
    guard: "canSubmit",
  },
  {
    file: "screens/open-account-screen/open-account-screen.tsx",
    fallback: 'router.replace("/(app)/(tabs)/accounts")',
    guard: "canSubmit",
  },
] as const;

function readForm(file: string): string {
  return fs.readFileSync(path.join(__dirname, "..", file), "utf8");
}

describe("cold-link post-save navigation", () => {
  for (const form of FORMS) {
    describe(form.file, () => {
      it("guards its post-save back with canGoBack", () => {
        const source = readForm(form.file);
        const backs = source.match(/router\.back\(\)/g) ?? [];
        expect(backs.length).toBe(1);
        expect(source.includes("router.canGoBack()")).toBe(true);
        expect(
          source.indexOf("router.back()") >
            source.indexOf("router.canGoBack()"),
        ).toBe(true);
      });

      it("falls back to the owning screen without a back stack", () => {
        expect(readForm(form.file).includes(form.fallback)).toBe(true);
      });

      it("disables submit once the save commits", () => {
        const source = readForm(form.file);
        expect(source.includes("const [saved, setSaved]")).toBe(true);
        expect(source.includes("setSaved(true)")).toBe(true);
        const guard = source.match(
          new RegExp(`const ${form.guard} =[\\s\\S]*?;`),
        );
        expect(guard === null).toBe(false);
        expect(guard![0].includes("!saved")).toBe(true);
      });
    });
  }
});
