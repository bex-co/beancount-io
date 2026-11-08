import fs from "fs";
import path from "path";

/**
 * w21/354: `accessibilityLiveRegion` is Android-only, so a message that relied
 * on it alone was never spoken to a VoiceOver user. Anything that declares a
 * live region must also announce on iOS.
 */
const srcDir = path.join(__dirname, "../../..");

const collect = (dir: string): string[] => {
  const out: string[] = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) {
      if (name !== "__tests__" && name !== "generated-graphql") {
        out.push(...collect(full));
      }
    } else if (/\.tsx?$/.test(name)) {
      out.push(full);
    }
  }
  return out;
};

const read = (file: string) => fs.readFileSync(file, "utf8");

describe("live regions and VoiceOver", () => {
  it("every file with a live region also announces on iOS", () => {
    const offenders = collect(srcDir)
      .filter((file) => /accessibilityLiveRegion/.test(read(file)))
      .filter((file) => !/announceForAccessibility/.test(read(file)))
      .map((file) => path.relative(srcDir, file));
    expect(offenders.join(", ")).toBe("");
  });

  // w21/484: `accessibilityRole="alert"` does nothing on iOS, so a bare one is a
  // silent error. Only the files that announce may declare it.
  it("no file declares the alert role without announcing on iOS", () => {
    const offenders = collect(srcDir)
      .filter((file) => /accessibilityRole="alert"/.test(read(file)))
      .filter((file) => !/announceForAccessibility/.test(read(file)))
      .map((file) => path.relative(srcDir, file));
    expect(offenders.join(", ")).toBe("");
  });

  it("toasts are announced on iOS, except the loading spinner", () => {
    const src = read(
      path.join(srcDir, "common/providers/toast-provider/index.tsx"),
    ).replace(/\s+/g, "");
    expect(
      src.includes(
        'if(Platform.OS==="ios"&&message.type!=="loading"){AccessibilityInfo.announceForAccessibility(message.message);}',
      ),
    ).toBe(true);
  });

  it("inline errors announce when their message changes", () => {
    const src = read(
      path.join(srcDir, "components/inline-error/index.tsx"),
    ).replace(/\s+/g, "");
    expect(
      src.includes(
        'if(Platform.OS==="ios")AccessibilityInfo.announceForAccessibility(message);},[message]',
      ),
    ).toBe(true);
  });

  it("the forms use InlineError rather than a bare Text", () => {
    for (const file of [
      "screens/multi-postings-transaction/multi-postings-transaction-screen.tsx",
      "screens/open-account-screen/open-account-screen.tsx",
      "screens/add-budget-screen/add-budget-screen.tsx",
      "screens/edit-transaction-screen/edit-transaction-screen.tsx",
      "components/text-input-modal/index.tsx",
      "screens/create-ledger-screen/create-ledger-screen.tsx",
      "screens/profile/profile-screen.tsx",
      "screens/welcome/server-settings-screen.tsx",
      "screens/welcome/index.tsx",
      "screens/budget-screen/components/budget-history-rows.tsx",
    ]) {
      expect(read(path.join(srcDir, file)).includes("<InlineError")).toBe(true);
    }
  });

  // w21/479: Create Ledger's field and form errors were plain Text, so VoiceOver never heard a refused
  // or conflicting Create.
  it("Create Ledger announces each of its errors", () => {
    const src = read(
      path.join(
        srcDir,
        "screens/create-ledger-screen/create-ledger-screen.tsx",
      ),
    ).replace(/\s+/g, "");
    for (const message of [
      "errors.name.message",
      "errors.description.message",
      "errors.root.message",
    ]) {
      expect(src.includes(`message={${message}}`)).toBe(true);
      expect(src.includes(`<Textstyle={styles.error}>{${message}}`)).toBe(
        false,
      );
    }
    expect(src.includes("<Textstyle={styles.formError}>")).toBe(false);
  });
});
