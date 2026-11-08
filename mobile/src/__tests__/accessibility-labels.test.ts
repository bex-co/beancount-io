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

const VECTOR_ICON =
  /\b(?:Ionicons|Feather|MaterialCommunityIcons|MaterialIcons|FontAwesome[56]?|AntDesign|Entypo|EvilIcons|Octicons|SimpleLineIcons|Foundation|Fontisto)\b/;

// The app's own Button renders PressableScale, which `Pressable\b` does not
// match (no word boundary between "e" and "S"), so each is named explicitly.
const OPEN_TAG = /<(TouchableOpacity|Pressable(?:Scale)?|Button)\b/g;

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

/** Where the element opened at `tagStart` closes: its children's end. */
function findClosingTag(source: string, from: number, name: string): number {
  const tag = new RegExp(`<${name}\\b|</${name}>`, "g");
  tag.lastIndex = from;
  let depth = 1;
  let match: RegExpExecArray | null;
  while ((match = tag.exec(source)) !== null) {
    if (match[0].startsWith("</")) {
      depth -= 1;
      if (depth === 0) return match.index;
      continue;
    }
    const end = findOpeningTagEnd(source, match.index + 1);
    if (end < 0) return -1;
    if (source[end - 2] !== "/") depth += 1;
    tag.lastIndex = end;
  }
  return -1;
}

type Pressable = {
  relFile: string;
  line: number;
  name: string;
  openingTag: string;
  children: string;
};

/** Every pressable element in the scanned trees, with its children's source. */
function scanPressables(): Pressable[] {
  const found: Pressable[] = [];
  for (const { base, dir: rootDir } of SCAN_ROOTS) {
    if (!fs.existsSync(rootDir)) continue;
    for (const file of walkTsxFiles(rootDir)) {
      const source = fs.readFileSync(file, "utf8");
      const relFile = path.relative(base, file).split(path.sep).join("/");
      const tags = new RegExp(OPEN_TAG.source, "g");
      let match: RegExpExecArray | null;
      while ((match = tags.exec(source)) !== null) {
        const tagEnd = findOpeningTagEnd(source, match.index + 1);
        if (tagEnd < 0) continue;
        const openingTag = source.slice(match.index, tagEnd);
        const selfClosing = openingTag.endsWith("/>");
        const close = selfClosing
          ? tagEnd
          : findClosingTag(source, tagEnd, match[1]);
        found.push({
          relFile,
          line: source.slice(0, match.index).split("\n").length,
          name: match[1],
          openingTag,
          children: source.slice(tagEnd, close < 0 ? tagEnd : close),
        });
      }
    }
  }
  return found;
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

  // The component names are the other place this scan can narrow silently.
  it("recognises every pressable primitive the app uses as a control", () => {
    const tags =
      "<TouchableOpacity <Pressable <PressableScale <Button <ButtonGroup";
    const found = [...tags.matchAll(new RegExp(OPEN_TAG.source, "g"))].map(
      (match) => match[1],
    );
    expect(found).toEqual([
      "TouchableOpacity",
      "Pressable",
      "PressableScale",
      "Button",
    ]);
  });

  it("icon-only pressables carry accessibilityLabel", () => {
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
          // Any @expo/vector-icons family, not only Ionicons: the keypad's
          // Delete key was a Feather glyph and slipped through (w21/358).
          const hasIcon =
            VECTOR_ICON.test(following) || /<Image\b/.test(following);
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

  // w21/141: with no label, iOS names a control by joining its children,
  // icon glyphs included: "Currency, USD, U+F23B".
  it("pressables holding an icon and text name themselves", () => {
    const violations = scanPressables()
      .filter(
        ({ openingTag, children }) =>
          /<Ionicons\b/.test(children) &&
          children.includes("<Text") &&
          !openingTag.includes("accessibilityLabel"),
      )
      .filter(({ relFile, line }) => !isAllowlisted(allowlist, relFile, line))
      .map(({ relFile, line }) => `${relFile}:${line}`);
    expect(violations).toEqual([]);
  });

  // A tappable without a role has no Button trait. A tap-outside backdrop is
  // hidden instead, and a spread of props (a helper's) is trusted to set one.
  it("pressables carry a role unless they are hidden", () => {
    const violations = scanPressables()
      .filter(
        ({ name, openingTag }) =>
          name !== "Button" &&
          !openingTag.includes("accessibilityRole") &&
          !openingTag.includes("accessible={false}") &&
          !openingTag.includes("{..."),
      )
      .filter(({ relFile, line }) => !isAllowlisted(allowlist, relFile, line))
      .map(({ relFile, line }) => `${relFile}:${line}`);
    expect(violations).toEqual([]);
  });

  it("the stricter checks catch what they are for", () => {
    const sample = `<TouchableOpacity onPress={go}>
  <Text>Currency</Text>
  <Ionicons name="chevron-forward" />
</TouchableOpacity>`;
    const tagEnd = findOpeningTagEnd(sample, 1);
    const children = sample.slice(
      tagEnd,
      findClosingTag(sample, tagEnd, "TouchableOpacity"),
    );
    expect(/<Ionicons\b/.test(children) && children.includes("<Text")).toBe(
      true,
    );
    expect(sample.slice(0, tagEnd).includes("accessibilityRole")).toBe(false);
  });
});

// w21/355: VoiceOver stops reading a placeholder once a field has text, and
// the visible label is a sibling Text, so a field without its own label read
// only its example or its value ("500", "Bank:Checking").
describe("text fields name themselves (w21/355)", () => {
  const fields = (): { relFile: string; line: number; tag: string }[] => {
    const found: { relFile: string; line: number; tag: string }[] = [];
    for (const { base, dir } of SCAN_ROOTS) {
      if (!fs.existsSync(dir)) continue;
      for (const file of walkTsxFiles(dir)) {
        const source = fs.readFileSync(file, "utf8");
        const open = /<TextInput\b/g;
        let match: RegExpExecArray | null;
        while ((match = open.exec(source)) !== null) {
          const end = findOpeningTagEnd(source, match.index + 1);
          if (end < 0) continue;
          found.push({
            relFile: path.relative(base, file).split(path.sep).join("/"),
            line: source.slice(0, match.index).split("\n").length,
            tag: source.slice(match.index, end),
          });
        }
      }
    }
    return found;
  };

  it("finds the app's text fields", () => {
    expect(fields().length >= 13).toBe(true);
  });

  it("every TextInput carries an accessibilityLabel", () => {
    const unnamed = fields()
      .filter(({ tag }) => !/accessibilityLabel(ledBy)?=/.test(tag))
      .map(({ relFile, line }) => `${relFile}:${line}`);
    expect(unnamed).toEqual([]);
  });
});

describe("the icon guardrail covers every vector-icon family (w21/358)", () => {
  it("recognises the families the app can import", () => {
    for (const family of [
      "Ionicons",
      "Feather",
      "MaterialCommunityIcons",
      "MaterialIcons",
      "FontAwesome5",
      "AntDesign",
    ]) {
      expect(VECTOR_ICON.test(`<${family} name="x" />`)).toBe(true);
    }
    expect(VECTOR_ICON.test("<Text>Delete</Text>")).toBe(false);
  });
});
