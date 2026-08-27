import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

/**
 * Static regression check for user-facing English that bypasses i18n.
 *
 * This intentionally targets high-signal UI surfaces rather than every string
 * literal: JSX children, accessibility/text attributes, toast copy, common UI
 * config fields, and default values of message/label props. Existing debt is
 * recorded as exact fingerprints in the reviewed snapshot; new literals and
 * stale baseline entries both fail the test.
 */

const SRC_ROOT = join(__dirname, "..");

type ViolationKind =
  | "JSX text"
  | "JSX expression"
  | "UI attribute"
  | "toast"
  | "UI config"
  | "UI prop default";

interface Violation {
  path: string;
  line: number;
  kind: ViolationKind;
  text: string;
}

const USER_FACING_ATTRIBUTES = new Set([
  "alt",
  "aria-description",
  "aria-label",
  "placeholder",
  "title",
]);

const USER_FACING_CONFIG_FIELDS = new Set([
  "description",
  "emptyMessage",
  "label",
  "message",
  "text",
  "title",
]);

const INTENTIONAL_LITERALS = new Set([
  "BQL",
  "Beancount",
  "Beancount.io",
  "Esc",
  "HTTP",
  "KB",
  "MM/DD/YYYY",
  "SSH",
  "USD",
]);

/**
 * Exact production literals whose spelling is part of a protocol, query,
 * keyboard shortcut, file-size unit, or Beancount account syntax.
 */
const INTENTIONAL_FINGERPRINTS = new Set([
  "features/bql/pages/index.tsx | UI config | select * from accounts",
  "features/bql/pages/index.tsx | UI config | select * from balances",
  "features/bql/pages/index.tsx | UI config | select * from entries",
  "features/bql/pages/index.tsx | UI config | select * from transactions",
  "features/journal/components/new-directive-dialog/open-account-form.tsx | UI attribute | :Bank:Checking",
  "features/journal/components/new-directive-dialog/open-account-form.tsx | UI attribute | Account:SubAccount",
  "features/ledger-data/accounts/open-account-dialog.tsx | UI attribute | :Bank:Checking",
  "features/ledger-editor/file-editor/components/ledger-file-view/file-edit-mode.tsx | JSX expression | Ctrl+/",
  "features/ledger-editor/file-editor/components/ledger-file-view/file-edit-mode.tsx | JSX expression | Ctrl+Alt+[",
  "features/ledger-editor/file-editor/components/ledger-file-view/file-edit-mode.tsx | JSX expression | Ctrl+Alt+]",
  "features/ledger-editor/file-editor/components/ledger-file-view/file-edit-mode.tsx | JSX expression | Ctrl+D",
  "features/ledger-editor/file-editor/components/ledger-file-view/file-edit-mode.tsx | JSX expression | Ctrl+S",
  "features/ledger-editor/file-editor/components/non-text-file-views.tsx | JSX expression | Ctrl+E",
  "features/ledger-editor/upload-files/index.tsx | JSX text | KB)",
]);

// This unused legacy helper is imported only by its unit test. Its eventual
// replacement must accept a translator before it can be used by production UI.
const NON_PRODUCTION_SOURCE_FILES = new Set([
  "features/importer/lib/import-step-config.ts",
]);

function collectSourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      if (
        entry === "__tests__" ||
        entry === "generated" ||
        entry === "locales" ||
        entry === "node_modules" ||
        entry === "test"
      ) {
        continue;
      }
      files.push(...collectSourceFiles(fullPath));
      continue;
    }

    if (
      /\.(ts|tsx)$/.test(entry) &&
      !/\.(test|spec)\.(ts|tsx)$/.test(entry) &&
      !entry.endsWith(".d.ts") &&
      !entry.endsWith("-locale.ts") &&
      !entry.endsWith("-translations.ts")
    ) {
      files.push(fullPath);
    }
  }
  return files;
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function isUserFacingText(text: string): boolean {
  const normalized = normalizeText(text);
  if (/^[a-z][\w-]*(?:\.[\w-]+)+$/.test(normalized)) return false;
  return (
    /[A-Za-z]{2}/.test(normalized) && !INTENTIONAL_LITERALS.has(normalized)
  );
}

function expressionTexts(node: ts.Expression): string[] {
  if (ts.isStringLiteralLike(node)) return [node.text];

  if (ts.isTemplateExpression(node)) {
    return [
      node.head.text +
        node.templateSpans.map((span) => span.literal.text).join(""),
    ];
  }

  if (ts.isConditionalExpression(node)) {
    return [
      ...expressionTexts(node.whenTrue),
      ...expressionTexts(node.whenFalse),
    ];
  }

  if (ts.isBinaryExpression(node)) {
    if (node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
      return expressionTexts(node.right);
    }
    if (
      node.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
      node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken ||
      node.operatorToken.kind === ts.SyntaxKind.PlusToken
    ) {
      return [...expressionTexts(node.left), ...expressionTexts(node.right)];
    }
    return [];
  }

  if (ts.isParenthesizedExpression(node)) {
    return expressionTexts(node.expression);
  }

  return [];
}

function propertyNameText(
  name: ts.PropertyName | ts.BindingName,
): string | null {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) return name.text;
  return null;
}

function collectViolationsFromSource(
  source: string,
  relativePath: string,
): Violation[] {
  const sourceFile = ts.createSourceFile(
    relativePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    relativePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const violations: Violation[] = [];

  const report = (node: ts.Node, kind: ViolationKind, rawText: string) => {
    const text = normalizeText(rawText);
    if (!isUserFacingText(text)) return;
    const violation: Violation = {
      path: relativePath,
      line:
        sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
          .line + 1,
      kind,
      text,
    };
    if (!INTENTIONAL_FINGERPRINTS.has(fingerprint(violation))) {
      violations.push(violation);
    }
  };

  const visit = (node: ts.Node): void => {
    if (ts.isJsxText(node)) {
      report(node, "JSX text", node.text);
    }

    if (
      ts.isJsxExpression(node) &&
      node.expression &&
      !ts.isJsxAttribute(node.parent)
    ) {
      for (const text of expressionTexts(node.expression)) {
        report(node, "JSX expression", text);
      }
    }

    if (
      ts.isJsxAttribute(node) &&
      ts.isIdentifier(node.name) &&
      USER_FACING_ATTRIBUTES.has(node.name.text) &&
      node.initializer
    ) {
      if (ts.isStringLiteral(node.initializer)) {
        report(node, "UI attribute", node.initializer.text);
      } else if (
        ts.isJsxExpression(node.initializer) &&
        node.initializer.expression
      ) {
        for (const text of expressionTexts(node.initializer.expression)) {
          report(node, "UI attribute", text);
        }
      }
    }

    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === "toast" &&
      ["error", "info", "success", "warning"].includes(
        node.expression.name.text,
      )
    ) {
      const firstArgument = node.arguments[0];
      if (firstArgument) {
        for (const text of expressionTexts(firstArgument)) {
          report(firstArgument, "toast", text);
        }
      }

      const options = node.arguments[1];
      if (options && ts.isObjectLiteralExpression(options)) {
        for (const property of options.properties) {
          if (
            ts.isPropertyAssignment(property) &&
            propertyNameText(property.name) === "description"
          ) {
            for (const text of expressionTexts(property.initializer)) {
              report(property.initializer, "toast", text);
            }
          }
        }
      }
    }

    if (ts.isPropertyAssignment(node)) {
      const name = propertyNameText(node.name);
      const objectLiteral = node.parent;
      const possibleToastCall = objectLiteral.parent;
      const isToastDescription =
        name === "description" &&
        ts.isCallExpression(possibleToastCall) &&
        ts.isPropertyAccessExpression(possibleToastCall.expression) &&
        ts.isIdentifier(possibleToastCall.expression.expression) &&
        possibleToastCall.expression.expression.text === "toast";
      if (name && USER_FACING_CONFIG_FIELDS.has(name) && !isToastDescription) {
        for (const text of expressionTexts(node.initializer)) {
          report(node.initializer, "UI config", text);
        }
      }
    }

    if (ts.isBindingElement(node) && node.initializer) {
      const name = propertyNameText(node.name);
      if (
        name &&
        (USER_FACING_CONFIG_FIELDS.has(name) || name.endsWith("Label"))
      ) {
        for (const text of expressionTexts(node.initializer)) {
          report(node.initializer, "UI prop default", text);
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return violations;
}

function fingerprint(violation: Violation): string {
  return `${violation.path} | ${violation.kind} | ${violation.text}`;
}

describe("no untranslated user-facing strings", () => {
  it("recognizes the supported user-facing string shapes", () => {
    const fixture = `
      const Example = ({ message = "Default message" }) => (
        <button aria-label={open ? "Hide panel" : "Show panel"}>
          Save changes
          {failed ? "Try again" : null}
        </button>
      );
      toast.success("Saved", { description: "Your changes were saved." });
      const option = { title: { text: "No data available" } };
    `;

    expect(
      collectViolationsFromSource(fixture, "fixture.tsx").map(
        (violation) => `${violation.kind}: ${violation.text}`,
      ),
    ).toEqual([
      "UI prop default: Default message",
      "UI attribute: Hide panel",
      "UI attribute: Show panel",
      "JSX text: Save changes",
      "JSX expression: Try again",
      "toast: Saved",
      "toast: Your changes were saved.",
      "UI config: No data available",
    ]);
  });

  it("does not introduce new untranslated production UI copy", () => {
    const violations = collectSourceFiles(SRC_ROOT).flatMap((file) =>
      NON_PRODUCTION_SOURCE_FILES.has(relative(SRC_ROOT, file))
        ? []
        : collectViolationsFromSource(
            readFileSync(file, "utf-8"),
            relative(SRC_ROOT, file),
          ),
    );
    const actual = violations.map(fingerprint).sort();
    const details = violations
      .map(
        (violation) =>
          `src/${violation.path}:${violation.line} [${violation.kind}] ${violation.text}`,
      )
      .join("\n");

    expect(
      actual,
      `User-facing copy must use useTranslations(). If this is intentional ` +
        `non-translatable text, update the reviewed baseline snapshot. ` +
        `Remove stale snapshot entries when fixing existing debt.\n${details}`,
    ).toMatchSnapshot();
  });
});
