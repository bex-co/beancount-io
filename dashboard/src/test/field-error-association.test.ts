import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";

/**
 * Static regression check: a form that renders a field's validation message
 * must associate it with the control, so the reason reaches someone who
 * cannot see the red text beside the input.
 *
 * `common/components/ui/form.tsx` already does this — `FormControl` emits
 * `aria-invalid` and `aria-describedby`, and `FormMessage` renders the
 * paragraph with the id it names — so files built on it satisfy the rule by
 * construction. Files that hand-roll a field error must name it themselves.
 * This has been repaired one field at a time across roughly eight commits;
 * the check is what stops the series.
 */

const SRC_ROOT = join(__dirname, "..");

/** file path (relative to src/) → why an unassociated field message is acceptable */
const ALLOWLIST: Record<string, string> = {};

/** A field-level validation message rendered into JSX. */
const RENDERS_FIELD_ERROR =
  /\{\s*errors[.[][^}]{0,60}?\??\.message[^}]{0,40}\}/;

function collectSourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "__tests__" || entry === "locales") continue;
      files.push(...collectSourceFiles(full));
      continue;
    }
    if (/\.tsx$/.test(entry) && !/\.(test|spec)\.tsx$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

describe("field validation messages are associated with their control", () => {
  const files = collectSourceFiles(SRC_ROOT);

  it("scans a sane number of components", () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it("finds forms that render a field error at all", () => {
    // Guards against the pattern silently matching nothing after a refactor.
    const rendering = files.filter((file) =>
      RENDERS_FIELD_ERROR.test(stripComments(readFileSync(file, "utf-8"))),
    );

    expect(rendering.length).toBeGreaterThan(3);
  });

  it("requires every such form to name the message from its control", () => {
    const violations: string[] = [];

    for (const file of files) {
      const rel = relative(SRC_ROOT, file);
      if (rel in ALLOWLIST) continue;

      const source = stripComments(readFileSync(file, "utf-8"));
      const match = RENDERS_FIELD_ERROR.exec(source);
      if (!match) continue;

      // `ui/form` owns the association for its consumers.
      if (source.includes("<FormMessage")) continue;
      if (source.includes("aria-describedby")) continue;

      const line = source.slice(0, match.index).split("\n").length;
      violations.push(`src/${rel}:~${line} → ${match[0].trim()}`);
    }

    expect(
      violations,
      "A rendered field error must be reachable from its control. Use " +
        "common/components/ui/form.tsx, or set aria-invalid and " +
        "aria-describedby on the control and give the message that id.",
    ).toEqual([]);
  });
});
