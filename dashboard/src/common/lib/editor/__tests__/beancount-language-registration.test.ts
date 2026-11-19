import { describe, it, expect, vi } from "vitest";
import type * as monacoType from "monaco-editor";
import { beancountTokenProvider } from "../monaco-beancount-language";

/**
 * The create-file editor registers through
 * `monaco-beancount-language`, while every other beancount editor
 * (file text editor, entry context panel, delete-account dialog) registers
 * through `monaco-beancount-language-vscode`. Both claim the same global
 * Monaco language id ("beancount"), so the last editor to mount replaces
 * the tokenizer for every open beancount model.
 *
 * Documented intent: `beancount-syntax.ts` states it "mirrors the Monaco
 * tokenization in monaco-beancount-language-vscode.ts", making the -vscode
 * module the canonical grammar, and each module's own comment says it
 * registers "only once to avoid errors" — a guard that is module-local and
 * cannot see the other module.
 */

type MonarchRule = unknown;

function winningTokenAtStart(
  provider: { tokenizer: { root: MonarchRule[] } },
  line: string,
): string | undefined {
  for (const rule of provider.tokenizer.root) {
    if (!Array.isArray(rule)) {
      continue; // { include: "@whitespace" }
    }
    const [pattern, action] = rule as [unknown, unknown];
    if (!(pattern instanceof RegExp)) {
      continue;
    }
    // Monarch matches each rule at the current position: emulate with a
    // sticky match anchored at index 0.
    const sticky = new RegExp(
      pattern.source,
      pattern.flags.includes("y") ? pattern.flags : `${pattern.flags}y`,
    );
    sticky.lastIndex = 0;
    const match = sticky.exec(line);
    if (match && match.index === 0 && match[0].length > 0) {
      if (typeof action === "string") {
        return action;
      }
      if (action && typeof action === "object" && "token" in action) {
        return (action as { token?: string }).token;
      }
      return undefined;
    }
  }
  return undefined;
}

// Winning token for each probe under the canonical (-vscode) grammar, which
// `beancount-syntax.ts` documents as the mirrored reference.
const CANONICAL_CASES: Array<[probe: string, token: string]> = [
  ["Assets", "constant.language.beancount"],
  ["Assets:Cash", "variable.beancount"],
  ["USD", "symbol.beancount"],
  ["open", "keyword.beancount"],
  ["2024-01-15", "constant.beancount"],
  ["; comment", "comment.beancount"],
  ["#tag", "symbol.beancount"],
  ["^link", "symbol.beancount"],
];

describe("beancount editor registration agreement", () => {
  it("tokenizes probes through the entry point the create-file editor uses like the canonical grammar does", () => {
    for (const [probe, token] of CANONICAL_CASES) {
      expect(
        winningTokenAtStart(beancountTokenProvider, probe),
        `probe ${JSON.stringify(probe)}`,
      ).toBe(token);
    }
  });

  it("installs exactly one tokenizer when both entry points register against one Monaco instance", async () => {
    vi.resetModules();
    const mockMonaco = {
      languages: {
        getLanguages: vi.fn(() => []),
        register: vi.fn(),
        setLanguageConfiguration: vi.fn(),
        setMonarchTokensProvider: vi.fn(),
        registerFoldingRangeProvider: vi.fn(),
        FoldingRangeKind: { Region: 3 },
      },
      editor: { defineTheme: vi.fn() },
    } as unknown as typeof monacoType;

    // Fresh copies defeat each module's own `isRegistered` guard, the same
    // way mounting the create-file page and the file text editor in one SPA
    // session reaches two separate guards.
    const [legacy, canonical] = await Promise.all([
      import("../monaco-beancount-language"),
      import("../monaco-beancount-language-vscode"),
    ]);

    legacy.registerBeancountLanguage(mockMonaco);
    canonical.registerBeancountLanguage(mockMonaco);

    const installs = (
      mockMonaco.languages.setMonarchTokensProvider as ReturnType<typeof vi.fn>
    ).mock.calls.filter(([id]) => id === "beancount");
    expect(installs.length).toBe(1);
  });
});
