import fs from "fs";
import path from "path";

/**
 * Static guardrail: icon-only TouchableOpacity/Pressable under screens,
 * components, and the Expo Router `app/` tree must carry an accessibilityLabel
 * on the opening tag.
 *
 * Heuristic (matches w4/m7): if the ~400 characters after the opening tag
 * contain Ionicons or Image and do not contain <Text, require
 * accessibilityLabel in the opening element (multiline props OK).
 *
 * `app/` is scanned from a second base path: route files live outside `src`, and
 * header controls declared there (the stack's default Back button) are as
 * icon-only as anything under `components`.
 */

const SRC_ROOT = path.join(__dirname, "..");
const PKG_ROOT = path.join(SRC_ROOT, "..");
/** Each scan root, with the base its allowlist paths are relative to. */
const SCAN_ROOTS = [
  { base: SRC_ROOT, dir: path.join(SRC_ROOT, "screens") },
  { base: SRC_ROOT, dir: path.join(SRC_ROOT, "components") },
  { base: PKG_ROOT, dir: path.join(PKG_ROOT, "app") },
] as const;
const ALLOWLIST_PATH = path.join(
  __dirname,
  "accessibility-label-allowlist.json",
);

type AllowlistEntry = {
  file: string;
  lineHint?: number;
  reason: string;
};

const OPEN_TAG = /<(TouchableOpacity|Pressable)\b/g;

/** Find the end of a JSX opening tag, ignoring `>` inside braces/parens/strings. */
function findOpeningTagEnd(source: string, start: number): number {
  let i = start;
  while (i < source.length && /[A-Za-z0-9]/.test(source[i])) i += 1;

  let brace = 0;
  let paren = 0;
  let bracket = 0;
  let inStr: string | null = null;

  for (let j = i; j < source.length; j += 1) {
    const c = source[j];
    if (inStr) {
      if (c === "\\" && j + 1 < source.length) {
        j += 1;
        continue;
      }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      inStr = c;
      continue;
    }
    if (c === "{") brace += 1;
    else if (c === "}") brace -= 1;
    else if (c === "(") paren += 1;
    else if (c === ")") paren -= 1;
    else if (c === "[") bracket += 1;
    else if (c === "]") bracket -= 1;
    else if (c === ">" && brace === 0 && paren === 0 && bracket === 0) {
      return j + 1;
    } else if (
      c === "/" &&
      source[j + 1] === ">" &&
      brace === 0 &&
      paren === 0 &&
      bracket === 0
    ) {
      return j + 2;
    }
  }
  return -1;
}

function walkTsxFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "__tests__" || entry.name === "node_modules") continue;
      out.push(...walkTsxFiles(full));
    } else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".jsx")) {
      out.push(full);
    }
  }
  return out;
}

function isAllowlisted(
  allowlist: AllowlistEntry[],
  relFile: string,
  line: number,
): boolean {
  return allowlist.some((entry) => {
    if (entry.file !== relFile) return false;
    if (entry.lineHint == null) return true;
    return Math.abs(entry.lineHint - line) <= 2;
  });
}

describe("accessibility labels on icon-only pressables (w4/m7)", () => {
  const allowlist: AllowlistEntry[] = JSON.parse(
    fs.readFileSync(ALLOWLIST_PATH, "utf8"),
  );

  it("every allowlist entry has a reason", () => {
    const silent = allowlist.filter((e) => !e.reason?.trim());
    expect(silent).toEqual([]);
  });

  // Without this, a wrong `app/` path would make the scan below silently cover
  // two thirds of the tree and still look green.
  it("scans the Expo Router app tree, not only src", () => {
    const relPaths = SCAN_ROOTS.filter(({ dir }) => fs.existsSync(dir)).flatMap(
      ({ base, dir }) =>
        walkTsxFiles(dir).map((file) =>
          path.relative(base, file).split(path.sep).join("/"),
        ),
    );
    expect(relPaths.some((rel) => rel.startsWith("app/"))).toBe(true);
    expect(relPaths.some((rel) => rel.startsWith("screens/"))).toBe(true);
    expect(relPaths.some((rel) => rel.startsWith("components/"))).toBe(true);
  });

  it("icon-only TouchableOpacity/Pressable carry accessibilityLabel", () => {
    const violations: string[] = [];

    for (const { base, dir: rootDir } of SCAN_ROOTS) {
      if (!fs.existsSync(rootDir)) continue;

      for (const file of walkTsxFiles(rootDir)) {
        const source = fs.readFileSync(file, "utf8");
        const relFile = path.relative(base, file).split(path.sep).join("/");

        OPEN_TAG.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = OPEN_TAG.exec(source)) !== null) {
          const tagStart = match.index;
          const tagEnd = findOpeningTagEnd(source, tagStart + 1);
          if (tagEnd < 0) continue;

          const openingTag = source.slice(tagStart, tagEnd);
          const following = source.slice(tagEnd, tagEnd + 400);
          const hasIcon =
            /\bIonicons\b/.test(following) || /<Image\b/.test(following);
          const hasText = following.includes("<Text");
          const hasLabel = openingTag.includes("accessibilityLabel");

          if (hasIcon && !hasText && !hasLabel) {
            const line = source.slice(0, tagStart).split("\n").length;
            if (isAllowlisted(allowlist, relFile, line)) continue;
            violations.push(`${relFile}:${line}`);
          }
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
